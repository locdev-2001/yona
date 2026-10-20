import Button from 'dashboard/components-next/button/Button';
import { useOptionalConversation } from 'dashboard/conversation/ConversationContext';
import { t } from '../../i18n';
import GroupRoomButton from './GroupRoomButton';
import { useCallSession } from './callSession';
import type { CallMediaKind } from './types';
import { useCallsEnabled } from './useCallsEnabled';
import { useOpenRoom } from './voiceRooms';

// Tin hoạt động mang `content_attributes.call` (do máy chủ ghi khi phòng/cuộc gọi đổi trạng thái).
export interface CallActivity {
    id: number;
    kind: string;
    status: string;
    media?: CallMediaKind;
}

const DIRECT_FINISHED_STATUSES = ['ended', 'missed', 'declined', 'cancelled'];

// Nút ngay dưới tin cuộc gọi: phòng nhóm còn mở thì "Vào phòng", cuộc gọi 1-1 đã xong thì "Gọi lại".
export default function CallActivityAction({ call, className = '' }: { call: CallActivity; className?: string }) {
    const conversation = useOptionalConversation();
    const session = useCallSession();
    const selected = conversation?.selectedConversation ?? null;
    const group = selected?.group ?? null;
    const openRoom = useOpenRoom(group);
    const callsEnabled = useCallsEnabled();

    if (!conversation || !selected) return null;

    if (group) {
        return call.status === 'active' && openRoom?.call_id === call.id ? (
            <GroupRoomButton accountId={conversation.accountId} group={group} isCompact={false} />
        ) : null;
    }

    if (!callsEnabled || call.kind !== 'direct' || !DIRECT_FINISHED_STATUSES.includes(call.status)) return null;

    const media = call.media ?? 'audio';

    return (
        <Button
            sm
            teal
            faded
            icon={media === 'video' ? 'i-lucide-video' : 'i-lucide-phone'}
            label={t('CALLS.DIRECT.CALL_BACK')}
            className={className}
            onClick={() => session.startDirectCall({ accountId: conversation.accountId, conversation: selected, media })}
        />
    );
}
