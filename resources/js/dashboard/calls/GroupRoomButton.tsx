import type { GroupSummary } from 'dashboard/conversation/groupsApi';
import { useCallSession } from './callSession';
import { useCallsEnabled } from './useCallsEnabled';
import { voiceRoomName } from './voiceRooms';
import type { VoiceRoomSummary } from './types';

// Vào (hoặc mở) một phòng thoại của nhóm; không chỉ phòng thì máy chủ chọn phòng đầu danh sách.
// null khi máy chủ cuộc gọi chưa cấu hình hoặc người xem đã rời nhóm.
export function useJoinGroupRoom(accountId: number, group: GroupSummary | null): ((room?: VoiceRoomSummary | null) => void) | null {
    const callsEnabled = useCallsEnabled();
    const call = useCallSession();

    if (!callsEnabled || !group || group.my_role === null) return null;

    return (room) => {
        if (call.isJoining) return;
        call.joinGroupRoom({
            accountId,
            groupId: group.id,
            title: room ? `${group.name} · ${voiceRoomName(room)}` : group.name,
            conversationUrl: window.location.pathname,
            canModerate: group.my_role === 'admin',
            roomId: room?.id ?? null,
            roomCallId: room?.live?.call_id ?? null,
        });
    };
}
