import Avatar from 'dashboard/components-next/avatar/Avatar';
import { conversationAvatar } from 'shared/avatar/avatarSeed';
import { t } from '../../i18n';
import type { GroupCallPayload } from './api';
import { useCallSession } from './callSession';
import { RingingCard, RingingScene } from './RingingCall';
import type { RingingCallerView } from './RingingCall';

function groupCaller(payload: GroupCallPayload): RingingCallerView {
    const call = payload.group_call;
    const callerName = call?.caller?.name ?? '';

    return {
        title: payload.group.name,
        subtitle: t(call?.media === 'video' ? 'CALLS.RINGING.GROUP_VIDEO_FROM' : 'CALLS.RINGING.GROUP_VOICE_FROM', { name: callerName }),
        renderAvatar: size => <Avatar name={payload.group.name} {...conversationAvatar(payload.group, 0, null)} size={size} />,
        joined: call?.participants ?? [],
    };
}

// Cuộc gọi nhóm đang đổ chuông tới mình, nổi trên mọi trang: thẻ gọn, mở rộng thì màn lớn.
export default function GroupCallRinging({ isPhone }: { isPhone: boolean }) {
    const { groupRing, groupRingActions: actions } = useCallSession();
    if (!groupRing) return null;

    const ringingProps = { caller: groupCaller(groupRing.payload), onAccept: actions.accept, onDecline: actions.decline, onOpenChat: actions.openChat };

    return groupRing.isExpanded ? (
        <RingingScene {...ringingProps} onMinimize={actions.collapse} />
    ) : (
        <RingingCard {...ringingProps} isPhone={isPhone} onExpand={actions.expand} />
    );
}
