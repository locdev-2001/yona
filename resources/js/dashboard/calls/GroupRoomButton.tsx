import { usePage } from '@inertiajs/react';
import type { GroupSummary } from 'dashboard/conversation/groupsApi';
import type { SharedPageProps } from '../../types';
import { useCallSession } from './callSession';
import JoinRoomButton from './JoinRoomButton';
import { useOpenRoom } from './voiceRooms';

// Nút phòng thoại ở mũ khung chat nhóm. Ẩn khi máy chủ cuộc gọi chưa cấu hình hoặc người xem
// đã rời nhóm; đang ngồi trong phòng này thì bấm là mở lại màn phòng.
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
    const callsEnabled = Boolean(usePage<SharedPageProps>().props.globalConfig?.callsEnabled);
    const call = useCallSession();
    const openRoom = useOpenRoom(group.id, group.voice_room);

    if (!callsEnabled || group.my_role === null) return null;

    const join = () => {
        if (call.isJoining) return;
        call.joinGroupRoom({
            accountId,
            groupId: group.id,
            title: group.name,
            conversationUrl: window.location.pathname,
            canModerate: group.my_role === 'admin',
        });
    };

    return <JoinRoomButton openRoom={openRoom} isCompact={isCompact} onJoin={join} className={className} />;
}
