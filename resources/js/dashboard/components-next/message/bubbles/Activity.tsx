import { messageTimestamp } from 'shared/helpers/timeHelper';

import CallActivityAction from 'dashboard/calls/CallActivityAction';
import { groupRoomStartText, isGroupRoomStart, readCallLog } from 'dashboard/calls/callLog';
import BaseBubble from './Base';
import CallMessageBubble from './CallMessage';
import { useMessageContext } from '../provider';

// Port từ dashboard/components-next/message/bubbles/Activity.vue —
// v-tooltip.top → attr title trên bubble.

export default function ActivityBubble() {
    const { content, createdAt, contentAttributes } = useMessageContext();
    // Tin cuộc gọi lưu dữ liệu có cấu trúc, lời dịch theo người đọc: phòng nhóm vừa mở là một dòng
    // (kèm nút Tham gia khi phòng còn mở), cuộc gọi đã xong là thẻ cuộc gọi.
    const call = readCallLog(contentAttributes);

    if (call && !isGroupRoomStart(call)) return <CallMessageBubble />;

    const text = call ? groupRoomStartText(call) : content;
    const readableTime = messageTimestamp(createdAt, 'LLL d, h:mm a');

    const bubble = (
        <BaseBubble
            className="px-3 py-1 !rounded-xl flex min-w-0 items-center gap-2"
            title={readableTime}
            dataBubbleName="activity"
        >
            <span title={text ?? ''}>{text}</span>
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
