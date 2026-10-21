import { useState } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import CallActivityAction from 'dashboard/calls/CallActivityAction';
import CallDetailsDialog from 'dashboard/calls/CallDetailsDialog';
import { useJoinGroupCall } from 'dashboard/calls/GroupCallButtons';
import { useGroupCall } from 'dashboard/calls/groupCalls';
import { useCallSession } from 'dashboard/calls/callSession';
import { describeCall, readCallLog } from 'dashboard/calls/callLog';
import type { CallTone } from 'dashboard/calls/callLog';
import { useOptionalConversation } from 'dashboard/conversation/ConversationContext';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';
import { ORIENTATION } from '../constants';

// Thẻ một cuộc gọi trong lịch sử chat, chung mọi kênh: ô biểu tượng tròn, tiêu đề, dòng phụ, nhãn
// trạng thái góc phải, hàng hành động dưới cùng (Gọi lại ở cuộc gọi không thành, còn lại "Xem chi
// tiết"). Gọi đi nằm bên phải trên nền tin của mình, gọi đến bên trái; đỏ chỉ dành cho cuộc gọi nhỡ
// hoặc thất bại.

const ATTENDEE_AVATAR_SIZE = 24;
const ATTENDEE_PLACEHOLDERS = 5;

const ICON_TONES: Record<CallTone, string> = {
    success: 'bg-n-teal-3 text-n-teal-11',
    danger: 'bg-n-ruby-3 text-n-ruby-11',
    info: 'bg-n-blue-3 text-n-blue-11',
    neutral: 'bg-n-alpha-2 text-n-slate-11',
    group: 'bg-n-violet-3 text-n-violet-11',
    live: 'bg-n-teal-3 text-n-teal-11',
};

const PILL_TONES: Record<CallTone, string> = {
    success: 'bg-n-teal-3 text-n-teal-11',
    danger: 'bg-n-ruby-3 text-n-ruby-11',
    info: 'bg-n-blue-3 text-n-blue-11',
    neutral: 'bg-n-alpha-2 text-n-slate-11',
    group: 'bg-n-blue-3 text-n-blue-11',
    live: 'bg-n-teal-3 text-n-teal-11',
};

// Nhỡ/không thành dùng chính biểu tượng của thẻ (nhỡ, từ chối, huỷ khác nhau).
const PILL_ICONS: Partial<Record<CallTone, string>> = {
    success: 'i-lucide-phone',
    info: 'i-lucide-check',
    group: 'i-lucide-check',
    live: 'i-lucide-audio-lines',
};

const ACTION_ROW_CLASS = 'w-full !h-[2.125rem] !rounded-[0.5625rem] !text-[0.6875rem] !font-semibold';

// Hàng Gọi lại ở cuộc gọi nhỡ có viền đỏ nhạt như thẻ, để nổi trên nền đỏ rất nhạt.
const CALL_BACK_FRAMES: Partial<Record<CallTone, string>> = {
    danger: 'border border-n-ruby-5 !bg-n-ruby-3 hover:enabled:!bg-n-ruby-4',
};

function surfaceClass(tone: CallTone, isOwn: boolean): string {
    if (tone === 'danger') return 'bg-n-ruby-2 border-n-ruby-5';
    if (isOwn) return 'bg-n-solid-blue border-n-blue-5';

    return 'bg-n-solid-1 border-n-weak';
}

export default function CallMessageBubble() {
    const { contentAttributes, orientation } = useMessageContext();
    const conversation = useOptionalConversation();
    const call = readCallLog(contentAttributes) ?? {};
    const group = conversation?.selectedConversation?.group ?? null;
    const view = describeCall(call, group?.name ?? '', useGroupCall(group));
    const joinGroupCall = useJoinGroupCall(conversation?.accountId ?? 0, group);
    const session = useCallSession();
    const isInThisGroupCall = session.activeKind === 'group_call' && session.groupId === group?.id;
    const isOwn = orientation === ORIENTATION.RIGHT;
    // Viền tách các avatar chồng nhau cùng màu nền thẻ, để không lộ khung sáng trên thẻ của mình.
    const attendeeRing = isOwn && view.tone !== 'danger' ? 'ring-n-solid-blue' : view.tone === 'danger' ? 'ring-n-ruby-2' : 'ring-n-solid-1';
    const [isDetailsOpen, setDetailsOpen] = useState(false);
    // Tin phòng cũ chỉ lưu tổng số người, không có danh sách: hàng avatar dùng ô trống thay mặt.
    const placeholderAttendees = view.isGroup && view.attendees.length === 0 ? Math.min(view.moreAttendees, ATTENDEE_PLACEHOLDERS) : 0;
    const moreAttendees = view.moreAttendees - placeholderAttendees;

    return (
        <BaseBubble bare className="w-[320px] !max-w-full" dataBubbleName="call-message">
            <div data-call-tone={view.tone} className={`flex flex-col gap-2.5 p-3 rounded-2xl border text-n-slate-12 ${surfaceClass(view.tone, isOwn)}`}>
                <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`flex flex-shrink-0 items-center justify-center size-[2.375rem] rounded-full ${ICON_TONES[view.tone]}`}>
                        <Icon icon={view.icon} className="size-[1.125rem]" />
                    </span>
                    <span className="flex flex-col flex-1 min-w-0 gap-0.5 pt-0.5">
                        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                            <span className="text-[0.8125rem] font-semibold leading-[1.125rem] truncate">{view.title}</span>
                            <span className={`flex flex-shrink-0 items-center gap-1 h-5 px-[0.4375rem] rounded-full text-[0.625rem] font-semibold leading-none whitespace-nowrap ${PILL_TONES[view.tone]}`}>
                                <Icon icon={view.tone === 'danger' || view.tone === 'neutral' ? view.icon : PILL_ICONS[view.tone]} className="size-3" />
                                {view.pill}
                            </span>
                        </span>
                        <span className="text-[0.6875rem] leading-4 text-n-slate-11 line-clamp-2 tabular-nums">{view.subtitle}</span>
                        {view.detail ? <span className="text-[0.6875rem] leading-4 text-n-slate-11 truncate tabular-nums">{view.detail}</span> : null}
                    </span>
                </div>
                {view.attendees.length + placeholderAttendees > 0 ? (
                    <div className="flex items-center ps-12">
                        {view.attendees.map(attendee => (
                            <Avatar
                                key={attendee.user_id}
                                name={attendee.name}
                                src={attendee.avatar_url ?? ''}
                                size={ATTENDEE_AVATAR_SIZE}
                                roundedFull
                                className={`-me-[0.4375rem] ring-2 ${attendeeRing}`}
                            />
                        ))}
                        {Array.from({ length: placeholderAttendees }, (_, index) => (
                            <span
                                key={`placeholder-${index}`}
                                className={`flex items-center justify-center size-6 -me-[0.4375rem] rounded-full bg-n-slate-4 text-n-slate-10 ring-2 ${attendeeRing}`}
                            >
                                <Icon icon="i-lucide-user-round" className="size-3.5" />
                            </span>
                        ))}
                        {moreAttendees > 0 ? (
                            <span className="flex items-center justify-center h-6 min-w-6 px-1.5 ms-2 rounded-full bg-n-alpha-2 text-[0.6875rem] font-medium text-n-slate-11">
                                {t('CALLS.LOG.MORE', { count: moreAttendees })}
                            </span>
                        ) : null}
                    </div>
                ) : null}
                {view.canJoin && joinGroupCall ? (
                    <Button
                        type="button"
                        sm
                        teal
                        solid
                        icon={view.icon}
                        label={t(isInThisGroupCall ? 'CALLS.LOG.OPEN_CALL' : 'CALLS.LOG.JOIN')}
                        className={`${ACTION_ROW_CLASS} !justify-center`}
                        onClick={() => joinGroupCall(view.media)}
                    />
                ) : view.canCallBack ? (
                    <CallActivityAction call={call} tone={view.tone} className={`${ACTION_ROW_CLASS} !justify-start ${CALL_BACK_FRAMES[view.tone] ?? ''}`} />
                ) : view.hasDetails ? (
                    <Button
                        type="button"
                        sm
                        faded
                        slate
                        trailingIcon
                        icon="i-lucide-chevron-right"
                        label={t('CALLS.DETAILS.VIEW')}
                        className={`${ACTION_ROW_CLASS} !justify-between !font-medium`}
                        onClick={() => setDetailsOpen(true)}
                    />
                ) : null}
            </div>
            {isDetailsOpen ? <CallDetailsDialog call={call} view={view} onClose={() => setDetailsOpen(false)} /> : null}
        </BaseBubble>
    );
}
