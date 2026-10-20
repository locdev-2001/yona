import type { GroupSummary } from 'dashboard/conversation/groupsApi';
import { useCallSession } from './callSession';
import JoinRoomButton from './JoinRoomButton';
import { useCallsEnabled } from './useCallsEnabled';
import { useOpenRoom } from './voiceRooms';

// Vào (hoặc mở) phòng thoại của nhóm; null khi máy chủ cuộc gọi chưa cấu hình hoặc người xem đã rời nhóm.
export function useJoinGroupRoom(accountId: number, group: GroupSummary | null): (() => void) | null {
    const callsEnabled = useCallsEnabled();
    const call = useCallSession();

    if (!callsEnabled || !group || group.my_role === null) return null;

    return () => {
        if (call.isJoining) return;
        call.joinGroupRoom({
            accountId,
            groupId: group.id,
            title: group.name,
            conversationUrl: window.location.pathname,
            canModerate: group.my_role === 'admin',
        });
    };
}

// Nút phòng thoại ở mũ khung chat nhóm; đang ngồi trong phòng này thì bấm là mở lại màn phòng.
export default function GroupRoomButton({
    accountId,
    group,
    isCompact,
    className = '',
}: {
    accountId: number;
    group: GroupSummary;
    isCompact: boolean;
    className?: string;
}) {
    const call = useCallSession();
    const openRoom = useOpenRoom(group);
    const join = useJoinGroupRoom(accountId, group);

    if (!join) return null;

    return (
        <JoinRoomButton openRoom={openRoom} isInRoom={call.groupId === group.id} isCompact={isCompact} onJoin={join} className={className} />
    );
}
