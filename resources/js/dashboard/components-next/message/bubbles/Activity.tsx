import { messageTimestamp } from 'shared/helpers/timeHelper';

import { GROUP_CALL_KIND, GROUP_ROOM_KIND, callStartText, isCallStartNotice, readCallLog } from 'dashboard/calls/callLog';
import { useGroupCall } from 'dashboard/calls/groupCalls';
import { useOpenRoom } from 'dashboard/calls/voiceRooms';
import { useOptionalConversation } from 'dashboard/conversation/ConversationContext';
import BaseBubble from './Base';
import CallMessageBubble from './CallMessage';
import { useMessageContext } from '../provider';
import { ORIENTATION } from '../constants';

// Port từ dashboard/components-next/message/bubbles/Activity.vue —
// v-tooltip.top → attr title trên bubble.

export default function ActivityBubble() {
    const { content, createdAt, contentAttributes, orientation } = useMessageContext();
    // Tin cuộc gọi lưu dữ liệu có cấu trúc, lời dịch theo người đọc. Phòng thoại hay cuộc gọi nhóm
    // còn đang diễn ra thì tin lúc bắt đầu là thẻ có nút Tham gia; đã xong thì danh sách chỉ giữ thẻ
    // kết thúc (withoutSupersededStartNotices). Tin bắt đầu còn lại mà không còn diễn ra là một dòng.
    const call = readCallLog(contentAttributes);
    const group = useOptionalConversation()?.selectedConversation?.group;
    const liveGroupCall = useGroupCall(group);
    const openRoom = useOpenRoom(group);
    const isLive =
        call?.id !== undefined &&
        (call.kind === GROUP_CALL_KIND ? liveGroupCall?.call_id === call.id : call.kind === GROUP_ROOM_KIND && openRoom?.call_id === call.id);

    if (call && (!isCallStartNotice(call) || isLive)) return <CallMessageBubble />;

    // Tin nằm cạnh người khởi tạo thì tên họ đã đứng đầu cụm, dòng không nhắc lại.
    const text = call ? callStartText(call, orientation === ORIENTATION.CENTER) : content;
    const readableTime = messageTimestamp(createdAt, 'LLL d, h:mm a');

    return (
        <BaseBubble
            className="px-3 py-1 !rounded-xl flex min-w-0 items-center gap-2"
            title={readableTime}
            dataBubbleName="activity"
        >
            <span title={text ?? ''}>{text}</span>
        </BaseBubble>
    );
}
