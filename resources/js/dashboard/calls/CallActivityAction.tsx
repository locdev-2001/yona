import Button from 'dashboard/components-next/button/Button';
import { useOptionalConversation } from 'dashboard/conversation/ConversationContext';
import { t } from '../../i18n';
import type { CallLogData, CallTone } from './callLog';
import { GROUP_ROOM_KIND, readCallLog } from './callLog';
import type { ConversationMessage } from 'dashboard/conversation/types';
import GroupRoomButton, { useJoinGroupRoom } from './GroupRoomButton';
import { useCallSession } from './callSession';
import { useCallsEnabled } from './useCallsEnabled';
import { useOpenRoom } from './voiceRooms';

// Nút Gọi lại trong thẻ cuộc gọi: đỏ ở cuộc gọi nhỡ/thất bại, trung tính ở cuộc mình chủ ý dừng.
// Mở lại phòng chỉ ở thẻ phòng mới nhất của nhóm, để nhiều phòng liền nhau không lặp nút.
function latestGroupRoomIdOf(messages: ConversationMessage[]): number | null {
    for (let index = messages.length - 1; index >= 0; index--) {
        const call = readCallLog(messages[index].content_attributes as Record<string, unknown> | undefined);
        if (call?.kind === GROUP_ROOM_KIND && call.id) return call.id;
    }

    return null;
}

const CALL_BACK_TONES: Partial<Record<CallTone, { ruby?: boolean; slate?: boolean }>> = {
    danger: { ruby: true },
};

// Hành động dưới tin cuộc gọi: phòng nhóm còn mở thì "Tham gia", phòng đã đóng thì mở lại phòng,
// cuộc gọi 1-1 không thành thì gọi lại đúng kiểu cũ (thoại/video).
export default function CallActivityAction({ call, tone = 'neutral', className = '' }: { call: CallLogData; tone?: CallTone; className?: string }) {
    const conversation = useOptionalConversation();
    const session = useCallSession();
    const selected = conversation?.selectedConversation ?? null;
    const group = selected?.group ?? null;
    const openRoom = useOpenRoom(group);
    const callsEnabled = useCallsEnabled();
    const joinGroupRoom = useJoinGroupRoom(conversation?.accountId ?? 0, group);

    if (!conversation || !selected) return null;

    const callBackTone = CALL_BACK_TONES[tone] ?? { slate: true };
    const callBack = (icon: string, onClick: () => void) => (
        <Button sm faded {...callBackTone} icon={icon} label={t('CALLS.DIRECT.CALL_BACK')} className={className} onClick={onClick} />
    );

    if (call.kind === GROUP_ROOM_KIND) {
        if (!group) return null;
        if (call.status !== 'ended') {
            return openRoom?.call_id === call.id ? <GroupRoomButton accountId={conversation.accountId} group={group} isCompact={false} /> : null;
        }

        // Đang có phòng mở thì tin "đã mở phòng" đã có nút Tham gia, thẻ không lặp nút.
        return joinGroupRoom && !openRoom && latestGroupRoomIdOf(conversation.messages) === call.id ? callBack('i-lucide-headphones', joinGroupRoom) : null;
    }

    if (!callsEnabled || call.kind !== 'direct') return null;

    const media = call.media === 'video' ? 'video' : 'audio';

    return callBack(media === 'video' ? 'i-lucide-video' : 'i-lucide-phone', () =>
        session.startDirectCall({ accountId: conversation.accountId, conversation: selected, media }),
    );
}
