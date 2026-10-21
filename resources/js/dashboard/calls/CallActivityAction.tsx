import Button from 'dashboard/components-next/button/Button';
import { useOptionalConversation } from 'dashboard/conversation/ConversationContext';
import { t } from '../../i18n';
import type { CallLogData, CallTone } from './callLog';
import { GROUP_ROOM_KIND } from './callLog';
import GroupRoomButton from './GroupRoomButton';
import { useCallSession } from './callSession';
import { useCallsEnabled } from './useCallsEnabled';
import { useOpenRoom } from './voiceRooms';

const CALL_BACK_TONES: Partial<Record<CallTone, { ruby?: boolean; slate?: boolean }>> = {
    danger: { ruby: true },
};

// Hành động dưới tin cuộc gọi: phòng nhóm còn mở thì "Tham gia" (phòng luôn mở, không phải cuộc
// gọi, nên phòng đã đóng không có nút), cuộc gọi 1-1 thì gọi lại đúng kiểu cũ (thoại/video): đỏ ở
// cuộc gọi nhỡ/thất bại, trung tính ở chỗ khác.
export default function CallActivityAction({
    call,
    tone = 'neutral',
    size = 'sm',
    className = '',
}: {
    call: CallLogData;
    tone?: CallTone;
    size?: 'sm' | 'md';
    className?: string;
}) {
    const conversation = useOptionalConversation();
    const session = useCallSession();
    const selected = conversation?.selectedConversation ?? null;
    const group = selected?.group ?? null;
    const openRoom = useOpenRoom(group);
    const callsEnabled = useCallsEnabled();

    if (!conversation || !selected) return null;

    const callBackTone = CALL_BACK_TONES[tone] ?? { slate: true };
    const callBack = (icon: string, onClick: () => void) => (
        <Button type="button" size={size} faded {...callBackTone} icon={icon} label={t('CALLS.DIRECT.CALL_BACK')} className={className} onClick={onClick} />
    );

    if (call.kind === GROUP_ROOM_KIND) {
        const isRoomOpen = group !== null && call.status !== 'ended' && openRoom?.call_id === call.id;

        return isRoomOpen ? <GroupRoomButton accountId={conversation.accountId} group={group} isCompact={false} /> : null;
    }

    if (!callsEnabled || call.kind !== 'direct') return null;

    const media = call.media === 'video' ? 'video' : 'audio';

    return callBack(media === 'video' ? 'i-lucide-video' : 'i-lucide-phone', () =>
        session.startDirectCall({ accountId: conversation.accountId, conversation: selected, media }),
    );
}
