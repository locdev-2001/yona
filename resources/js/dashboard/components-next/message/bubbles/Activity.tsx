import { messageTimestamp } from 'shared/helpers/timeHelper';

import CallActivityJoin from 'dashboard/calls/CallActivityJoin';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Port từ dashboard/components-next/message/bubbles/Activity.vue —
// v-tooltip.top → attr title trên bubble.

export default function ActivityBubble() {
    const { content, createdAt, contentAttributes } = useMessageContext();
    // Tin mở phòng thoại mang id cuộc gọi: phòng còn mở thì có nút vào ngay dưới tin.
    const openedCall = (contentAttributes.call ?? null) as { id: number; status: string } | null;

    const readableTime = messageTimestamp(createdAt, 'LLL d, h:mm a');

    const bubble = (
        <BaseBubble
            className="px-3 py-1 !rounded-xl flex min-w-0 items-center gap-2"
            title={readableTime}
            dataBubbleName="activity"
        >
            <span title={content ?? ''}>{content}</span>
        </BaseBubble>
    );

    if (openedCall?.status !== 'active') return bubble;

    return (
        <div className="flex flex-col items-center gap-1.5">
            {bubble}
            <CallActivityJoin callId={openedCall.id} />
        </div>
    );
}
