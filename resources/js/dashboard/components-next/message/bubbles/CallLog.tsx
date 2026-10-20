import Icon from 'dashboard/components-next/icon/Icon';
import CallActivityAction from 'dashboard/calls/CallActivityAction';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Nhật ký một cuộc gọi, chung mọi kênh (Zalo, gọi giữa người dùng Yona): tin đi/đến như tin nhắn
// thường, trong bong bóng là ô biểu tượng, lời theo góc nhìn của mình (gọi đi hay gọi đến) và
// thời lượng hoặc kết cục. Kênh gọi lại được thì có nút Gọi lại ngay trong bong bóng.

type CallOutcome = 'completed' | 'missed' | 'busy' | 'canceled' | 'declined';

export interface CallLog {
    id?: number;
    kind?: string;
    status?: string;
    media?: 'voice' | 'video' | null;
    direction?: 'inbound' | 'outbound' | null;
    outcome?: CallOutcome | null;
    duration_seconds?: number | null;
}

// Kết cục không trọn vẹn → lời cho [gọi đến, gọi đi].
const OUTCOME_TITLES: Record<Exclude<CallOutcome, 'completed'>, [string, string]> = {
    missed: ['CALLS.LOG.MISSED', 'CALLS.LOG.NO_ANSWER'],
    canceled: ['CALLS.LOG.MISSED', 'CALLS.LOG.CANCELLED'],
    declined: ['CALLS.LOG.YOU_DECLINED', 'CALLS.LOG.DECLINED_BY_PEER'],
    busy: ['CALLS.LOG.BUSY', 'CALLS.LOG.BUSY'],
};

const TILE_TONES = {
    completed: 'bg-n-teal-9/15 text-n-teal-11',
    missed: 'bg-n-ruby-9/15 text-n-ruby-11',
    neutral: 'bg-n-slate-9/15 text-n-slate-11',
};

function formatDuration(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);

    return `${minutes}:${String(totalSeconds % 60).padStart(2, '0')}`;
}

export default function CallLogBubble() {
    const { contentAttributes } = useMessageContext();
    const call = (contentAttributes.call ?? {}) as CallLog;

    const isVideo = call.media === 'video';
    const isInbound = call.direction !== 'outbound';
    const seconds = call.duration_seconds ?? 0;
    const outcome: CallOutcome = call.outcome ?? (seconds > 0 ? 'completed' : 'missed');
    const kindLabel = t(isVideo ? 'CALLS.LOG.VIDEO' : 'CALLS.LOG.VOICE');
    // Với người xem, cuộc gọi đến không ai bắt máy (nhỡ hoặc người gọi huỷ) là cuộc gọi nhỡ.
    const isMissedForViewer = isInbound && (outcome === 'missed' || outcome === 'canceled');

    const title = outcome === 'completed' ? kindLabel : t(OUTCOME_TITLES[outcome][isInbound ? 0 : 1]);
    const detail = outcome === 'completed' ? formatDuration(seconds) : kindLabel;
    const tone = outcome === 'completed' ? TILE_TONES.completed : isMissedForViewer ? TILE_TONES.missed : TILE_TONES.neutral;
    const icon = isMissedForViewer
        ? isVideo
            ? 'i-lucide-video-off'
            : 'i-lucide-phone-missed'
        : isVideo
          ? 'i-lucide-video'
          : isInbound
            ? 'i-lucide-phone-incoming'
            : 'i-lucide-phone-outgoing';

    return (
        <BaseBubble className="flex flex-col gap-2 p-2 min-w-[12.5rem]" dataBubbleName="call-log">
            <div className="flex items-center gap-3 pe-2">
                <span className={`flex flex-shrink-0 items-center justify-center size-9 rounded-lg ${tone}`}>
                    <Icon icon={icon} className="size-[1.125rem]" />
                </span>
                <span className="flex flex-col min-w-0">
                    <span className={`text-sm font-medium truncate ${isMissedForViewer ? 'text-n-ruby-11' : ''}`}>{title}</span>
                    <span className="text-xs truncate opacity-70 tabular-nums">{detail}</span>
                </span>
            </div>
            <CallActivityAction
                call={{ id: call.id ?? 0, kind: call.kind ?? '', status: call.status ?? '', media: isVideo ? 'video' : 'audio' }}
                className="w-full justify-center"
            />
        </BaseBubble>
    );
}
