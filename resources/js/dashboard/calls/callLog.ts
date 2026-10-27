import { t } from '../../i18n';
import type { GroupCallSummary, OpenRoomSummary } from './types';

// Một tin cuộc gọi đọc từ `content_attributes.call`, chung mọi kênh: gọi 1-1 giữa người dùng Yona
// (tin đi/đến, có hướng và kết cục), cuộc gọi Zalo (có hướng, có thể không có `kind`) và phòng
// thoại nhóm (tin hoạt động, lưu một bản cho mọi thành viên nên lời dịch lúc hiển thị theo người
// đọc), cuộc gọi nhóm có đổ chuông (tin lúc bắt đầu và tin lúc kết thúc, như phòng thoại). Thẻ trong
// lịch sử chat và dòng xem trước ở danh sách cùng đọc ở đây.

type CallOutcome = 'completed' | 'missed' | 'busy' | 'canceled' | 'declined';

export interface CallAttendee {
    user_id: number;
    name: string;
    avatar_url: string | null;
}

export interface CallLogData {
    id?: number;
    kind?: string;
    status?: string;
    media?: 'voice' | 'video' | 'audio' | null;
    direction?: 'inbound' | 'outbound' | null;
    outcome?: CallOutcome | null;
    duration_seconds?: number | null;
    // Mốc thời gian ISO: 1-1 có đổ chuông/nghe máy/kết thúc, phòng nhóm có mở/đóng. Tin cũ không có.
    rang_at?: string | null;
    answered_at?: string | null;
    started_at?: string | null;
    ended_at?: string | null;
    participants?: number;
    attendees?: CallAttendee[];
    actor?: { user_id: number; name: string } | null;
}

export type CallTone = 'success' | 'danger' | 'info' | 'neutral' | 'group' | 'live';

export interface CallLogView {
    tone: CallTone;
    icon: string;
    title: string;
    subtitle: string;
    // Dòng thứ ba của thẻ nhóm (thời lượng); thẻ 1-1 gộp thời lượng vào dòng phụ.
    detail: string | null;
    pill: string;
    media: 'audio' | 'video';
    isGroup: boolean;
    canCallBack: boolean;
    // Cuộc gọi do Yona ghi (có mã) thì mở được hộp chi tiết; cuộc gọi kênh ngoài thì không.
    hasDetails: boolean;
    // Cuộc gọi nhóm còn đang diễn ra: thẻ có nút Tham gia.
    canJoin: boolean;
    attendees: CallAttendee[];
    moreAttendees: number;
    preview: { text: string; icon: string; isAlert: boolean };
}

export const GROUP_ROOM_KIND = 'group_room';
export const GROUP_CALL_KIND = 'group_call';
const DIRECT_KIND = 'direct';
const GROUP_CALL_START_STATUS = 'ringing';

const STATUS_OUTCOMES: Record<string, CallOutcome> = {
    ended: 'completed',
    missed: 'missed',
    declined: 'declined',
    cancelled: 'canceled',
};

// Hàng avatar trên thẻ chỉ cần vài người đầu, phần còn lại hiện "+N"; hộp chi tiết liệt kê đủ.
const LISTED_ATTENDEES = 5;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

export function readCallLog(contentAttributes: Record<string, unknown> | null | undefined): CallLogData | null {
    const call = contentAttributes?.call;

    return call && typeof call === 'object' ? (call as CallLogData) : null;
}

// Hai đơn vị lớn nhất như phía máy chủ: "1 giờ 5 phút", "12 phút 46 giây", "8 giây".
export function formatCallDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
    const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    const parts = [
        hours > 0 ? t('CALLS.LOG.HOURS', { n: hours }) : null,
        minutes > 0 ? t('CALLS.LOG.MINUTES', { n: minutes }) : null,
        seconds > 0 || totalSeconds === 0 ? t('CALLS.LOG.SECONDS', { n: seconds }) : null,
    ].filter((part): part is string => part !== null);

    return parts.slice(0, 2).join(' ');
}

// Tin lúc phòng thoại mở hay cuộc gọi nhóm bắt đầu (khác tin lúc kết thúc của cùng cuộc đó).
export function isCallStartNotice(call: CallLogData): boolean {
    return (call.kind === GROUP_ROOM_KIND && call.status !== 'ended') || (call.kind === GROUP_CALL_KIND && call.status === GROUP_CALL_START_STATUS);
}

export function callStartIcon(call: CallLogData): string {
    return call.kind === GROUP_CALL_KIND ? 'i-lucide-phone' : 'i-lucide-headphones';
}

// Tin "đã mở phòng thoại" / "đã bắt đầu cuộc gọi nhóm". Tin nằm cạnh người khởi tạo (tên họ đã
// đứng đầu cụm) hay tin cũ chưa lưu người mở thì nói không kèm tên.
export function callStartText(call: CallLogData, showsActor = true): string {
    const actor = showsActor ? call.actor?.name : undefined;
    if (call.kind === GROUP_CALL_KIND) return actor ? t('CALLS.LOG.GROUP_CALL_STARTED', { actor }) : t('CALLS.LOG.GROUP_CALL_STARTED_SOMEONE');

    return actor ? t('CALLS.LOG.ROOM_STARTED', { actor }) : t('CALLS.LOG.ROOM_STARTED_SOMEONE');
}

// Một cuộc gọi một thẻ, đứng ở chỗ cuộc gọi bắt đầu. Máy chủ ghi kết quả đè lên chính tin bắt đầu;
// dữ liệu cũ còn cặp tin bắt đầu + tin kết thúc riêng thì thẻ kết thúc được vẽ vào chỗ tin bắt đầu.
export function withoutSupersededStartNotices<T extends { content?: string | null; content_attributes?: Record<string, unknown> | null }>(
    messages: T[],
): T[] {
    const startedIds = new Set<number>();
    const finishedById = new Map<number, T>();
    messages.forEach((message) => {
        const call = readCallLog(message.content_attributes);
        if (!call?.id || (call.kind !== GROUP_ROOM_KIND && call.kind !== GROUP_CALL_KIND)) return;
        if (isCallStartNotice(call)) startedIds.add(call.id);
        else finishedById.set(call.id, message);
    });
    const pairedIds = [...finishedById.keys()].filter((id) => startedIds.has(id));
    if (pairedIds.length === 0) return messages;
    const paired = new Set(pairedIds);

    return messages.flatMap((message) => {
        const call = readCallLog(message.content_attributes);
        if (!call?.id || !paired.has(call.id)) return [message];
        if (!isCallStartNotice(call)) return [];
        const finished = finishedById.get(call.id) as T;

        return [{ ...message, content: finished.content, content_attributes: finished.content_attributes }];
    });
}

function outcomeOf(call: CallLogData): CallOutcome {
    if (call.outcome) return call.outcome;
    const hasTalked = (call.duration_seconds ?? 0) > 0;
    const fromStatus = call.status ? STATUS_OUTCOMES[call.status] : undefined;
    if (fromStatus === 'completed') return hasTalked ? 'completed' : 'missed';

    return fromStatus ?? (hasTalked ? 'completed' : 'missed');
}

// Phòng thoại vừa mở mà còn đang mở (`live`): thẻ có người đang ngồi và nút Tham gia.
function liveRoomView(live: OpenRoomSummary): CallLogView {
    const people = live.participants;

    return {
        tone: 'live',
        icon: 'i-lucide-headphones',
        title: t('CALLS.LOG.GROUP_ROOM'),
        subtitle: t('CALLS.LOG.ROOM_LIVE', { count: live.total }),
        detail: null,
        pill: t('CALLS.LOG.STATE_OPEN'),
        media: 'audio',
        isGroup: true,
        canCallBack: false,
        hasDetails: false,
        canJoin: true,
        attendees: people.slice(0, LISTED_ATTENDEES),
        moreAttendees: Math.max(0, live.total - Math.min(people.length, LISTED_ATTENDEES)),
        preview: { text: t('CALLS.LOG.GROUP_ROOM'), icon: 'i-lucide-headphones', isAlert: false },
    };
}

function pendingGroupView(title: string, icon: string, media: 'audio' | 'video', groupName: string): CallLogView {
    return {
        tone: 'neutral',
        icon,
        title,
        subtitle: groupName,
        detail: null,
        pill: t('CALLS.LOG.STATE_UPDATING'),
        media,
        isGroup: true,
        canCallBack: false,
        hasDetails: false,
        canJoin: false,
        attendees: [],
        moreAttendees: 0,
        preview: { text: title, icon, isAlert: false },
    };
}

function groupRoomView(call: CallLogData, groupName: string, liveRoom: OpenRoomSummary | null): CallLogView {
    if (isCallStartNotice(call)) {
        return liveRoom && liveRoom.call_id === call.id
            ? liveRoomView(liveRoom)
            : pendingGroupView(t('CALLS.LOG.GROUP_ROOM'), 'i-lucide-headphones', 'audio', groupName);
    }

    const total = call.participants ?? call.attendees?.length ?? 0;
    const attendees = (call.attendees ?? []).slice(0, LISTED_ATTENDEES);
    const duration = formatCallDuration(call.duration_seconds ?? 0);

    return {
        tone: 'group',
        icon: 'i-lucide-users',
        title: t('CALLS.LOG.GROUP_ROOM'),
        subtitle: t('CALLS.LOG.ROOM_PEOPLE', { group: groupName, count: total }),
        detail: t('CALLS.LOG.ENDED_FOR', { duration }),
        pill: t('CALLS.LOG.STATE_ENDED'),
        media: 'audio',
        isGroup: true,
        canCallBack: false,
        hasDetails: Boolean(call.id),
        canJoin: false,
        attendees,
        moreAttendees: Math.max(0, total - attendees.length),
        preview: { text: `${t('CALLS.LOG.GROUP_ROOM')} · ${duration}`, icon: 'i-lucide-users', isAlert: false },
    };
}

// Cuộc gọi nhóm có đổ chuông. Tin lúc bắt đầu chỉ thành thẻ khi cuộc gọi còn diễn ra (`live`):
// ai đang ở trong và nút Tham gia; tin lúc kết thúc là kết quả, thời lượng, ai đã tham gia.
function groupCallView(call: CallLogData, groupName: string, live: GroupCallSummary | null): CallLogView {
    const isVideo = call.media === 'video';
    const title = t(isVideo ? 'CALLS.LOG.GROUP_CALL_VIDEO' : 'CALLS.LOG.GROUP_CALL_VOICE');
    const icon = isVideo ? 'i-lucide-video' : 'i-lucide-phone';
    const base = { icon, title, media: isVideo ? ('video' as const) : ('audio' as const), isGroup: true, canCallBack: false };

    if (call.status === GROUP_CALL_START_STATUS) {
        if (!live || live.call_id !== call.id) return pendingGroupView(title, icon, base.media, groupName);
        const people = live?.participants ?? [];

        return {
            ...base,
            tone: 'live',
            subtitle: t('CALLS.LOG.GROUP_CALL_LIVE', { count: live?.total ?? 0 }),
            detail: null,
            pill: t('CALLS.LOG.STATE_LIVE'),
            hasDetails: false,
            canJoin: live !== null,
            attendees: people.slice(0, LISTED_ATTENDEES),
            moreAttendees: Math.max(0, (live?.total ?? 0) - Math.min(people.length, LISTED_ATTENDEES)),
            preview: { text: callStartText(call), icon, isAlert: false },
        };
    }

    const total = call.participants ?? call.attendees?.length ?? 0;
    const isAnswered = Boolean(call.answered_at);
    const duration = formatCallDuration(call.duration_seconds ?? 0);
    const isCancelled = call.status === 'cancelled';
    const outcome = isAnswered
        ? t('CALLS.LOG.ENDED_FOR', { duration })
        : t(isCancelled ? 'CALLS.LOG.GROUP_CALL_CANCELLED' : 'CALLS.LOG.GROUP_CALL_UNANSWERED');

    // Không ai nghe: người duy nhất trong phòng là người gọi, nên không kể số người và avatar.
    return {
        ...base,
        tone: isAnswered ? 'group' : 'neutral',
        subtitle: isAnswered ? t('CALLS.LOG.ROOM_PEOPLE', { group: groupName, count: total }) : groupName,
        // Không ai nghe: nhãn trạng thái đã nói đủ, không lặp thành dòng riêng.
        detail: isAnswered || isCancelled ? outcome : null,
        pill: t(isAnswered ? 'CALLS.LOG.STATE_ENDED' : isCancelled ? 'CALLS.LOG.STATE_CANCELLED' : 'CALLS.LOG.STATE_UNANSWERED'),
        hasDetails: Boolean(call.id),
        canJoin: false,
        attendees: isAnswered ? (call.attendees ?? []).slice(0, LISTED_ATTENDEES) : [],
        moreAttendees: isAnswered ? Math.max(0, total - Math.min(call.attendees?.length ?? 0, LISTED_ATTENDEES)) : 0,
        preview: { text: `${title} · ${isAnswered ? duration : outcome}`, icon, isAlert: false },
    };
}

export function describeCall(
    call: CallLogData,
    groupName = '',
    live: GroupCallSummary | null = null,
    liveRoom: OpenRoomSummary | null = null,
): CallLogView {
    if (call.kind === GROUP_ROOM_KIND) return groupRoomView(call, groupName, liveRoom);
    if (call.kind === GROUP_CALL_KIND) return groupCallView(call, groupName, live);

    const isVideo = call.media === 'video';
    const outcome = outcomeOf(call);
    const isInbound = call.direction !== 'outbound';
    const hasDirection = Boolean(call.direction);
    const mediaLabel = t(isVideo ? 'CALLS.LOG.VIDEO' : 'CALLS.LOG.VOICE');
    const base = {
        detail: null,
        media: isVideo ? ('video' as const) : ('audio' as const),
        isGroup: false,
        hasDetails: call.kind === DIRECT_KIND && Boolean(call.id),
        canJoin: false,
        attendees: [],
        moreAttendees: 0,
    };
    const canCallBack = call.kind === DIRECT_KIND;

    if (outcome === 'completed') {
        const duration = formatCallDuration(call.duration_seconds ?? 0);
        const icon = isVideo
            ? 'i-lucide-video'
            : !hasDirection
              ? 'i-lucide-phone'
              : isInbound
                ? 'i-lucide-phone-incoming'
                : 'i-lucide-phone-outgoing';
        const title = hasDirection ? t(isInbound ? 'CALLS.LOG.INCOMING' : 'CALLS.LOG.OUTGOING') : mediaLabel;

        return {
            ...base,
            tone: hasDirection ? 'success' : 'info',
            icon,
            title,
            subtitle: t(hasDirection ? 'CALLS.LOG.CONNECTED_FOR' : 'CALLS.LOG.ENDED_FOR', { duration }),
            pill: t(hasDirection ? 'CALLS.LOG.STATE_CONNECTED' : 'CALLS.LOG.STATE_ENDED'),
            canCallBack: false,
            preview: { text: `${title} · ${duration}`, icon, isAlert: false },
        };
    }

    // Với người xem, cuộc gọi đến không ai bắt máy (nhỡ, người gọi huỷ, đang bận) là cuộc gọi nhỡ.
    const isMissedByViewer = isInbound && outcome !== 'declined';
    if (isMissedByViewer || outcome === 'missed') {
        const icon = isVideo ? 'i-lucide-video-off' : 'i-lucide-phone-missed';
        const subtitle = t(isMissedByViewer ? 'CALLS.LOG.YOU_MISSED' : 'CALLS.LOG.NO_ANSWER');

        return {
            ...base,
            tone: 'danger',
            icon,
            title: t('CALLS.LOG.MISSED'),
            subtitle,
            pill: t('CALLS.LOG.STATE_MISSED'),
            canCallBack,
            preview: isMissedByViewer
                ? { text: t('CALLS.LOG.PREVIEW_MISSED'), icon, isAlert: true }
                : { text: `${t('CALLS.LOG.MISSED')} · ${subtitle}`, icon, isAlert: false },
        };
    }

    // Còn lại là cuộc không thành: người nhận từ chối hoặc bận (thất bại, màu đỏ), mình từ chối
    // hoặc mình huỷ (chủ ý, trung tính).
    const isFailure = !isInbound && (outcome === 'declined' || outcome === 'busy');
    const subtitleKey = isInbound
        ? 'CALLS.LOG.YOU_DECLINED'
        : outcome === 'declined'
          ? 'CALLS.LOG.DECLINED_BY_PEER'
          : outcome === 'busy'
            ? 'CALLS.LOG.PEER_BUSY'
            : 'CALLS.LOG.YOU_CANCELLED';
    const pillKey = outcome === 'declined' ? 'CALLS.LOG.STATE_DECLINED' : outcome === 'busy' ? 'CALLS.LOG.STATE_BUSY' : 'CALLS.LOG.STATE_CANCELLED';
    const icon = isVideo ? 'i-lucide-video-off' : 'i-lucide-phone-off';
    const subtitle = t(subtitleKey);

    return {
        ...base,
        tone: isFailure ? 'danger' : 'neutral',
        icon,
        title: mediaLabel,
        subtitle,
        pill: t(pillKey),
        canCallBack,
        preview: { text: `${mediaLabel} · ${subtitle}`, icon, isAlert: false },
    };
}
