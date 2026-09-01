import { messageTimestamp } from 'shared/helpers/timeHelper';

import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Port từ dashboard/components-next/message/bubbles/Activity.vue —
// v-tooltip.top → attr title trên bubble.

export default function ActivityBubble() {
    const { content, createdAt } = useMessageContext();

    const readableTime = messageTimestamp(createdAt, 'LLL d, h:mm a');

    return (
        <BaseBubble
            className="px-3 py-1 !rounded-xl flex min-w-0 items-center gap-2"
            title={readableTime}
            dataBubbleName="activity"
        >
            <span title={content ?? ''}>{content}</span>
        </BaseBubble>
    );
}
