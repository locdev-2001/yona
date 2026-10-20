import { messageTimestamp } from 'shared/helpers/timeHelper';

import CallActivityAction from 'dashboard/calls/CallActivityAction';
import type { CallActivity } from 'dashboard/calls/CallActivityAction';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Port từ dashboard/components-next/message/bubbles/Activity.vue —
// v-tooltip.top → attr title trên bubble.

export default function ActivityBubble() {
    const { content, createdAt, contentAttributes } = useMessageContext();
    // Tin cuộc gọi mang `call`: phòng nhóm còn mở thì có nút vào, cuộc gọi 1-1 xong thì có nút gọi lại.
    const call = (contentAttributes.call ?? null) as CallActivity | null;

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

    if (!call) return bubble;

    return (
        <div className="flex flex-col items-center gap-1.5">
            {bubble}
            <CallActivityAction call={call} />
        </div>
    );
}
