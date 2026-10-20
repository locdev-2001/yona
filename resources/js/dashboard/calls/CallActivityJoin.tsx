import { useOptionalConversation } from 'dashboard/conversation/ConversationContext';
import GroupRoomButton from './GroupRoomButton';
import { useOpenRoom } from './voiceRooms';

// Nút vào phòng ngay dưới tin "đã mở phòng thoại", chỉ hiện khi đúng phòng đó còn mở.
export default function CallActivityJoin({ callId }: { callId: number }) {
    const conversation = useOptionalConversation();
    const group = conversation?.selectedConversation?.group ?? null;
    const openRoom = useOpenRoom(group?.id, group?.voice_room);

    if (!conversation || !group || openRoom?.call_id !== callId) return null;

    return <GroupRoomButton accountId={conversation.accountId} group={group} isCompact={false} />;
}
