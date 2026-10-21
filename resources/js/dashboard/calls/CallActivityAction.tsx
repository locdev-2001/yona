import Button from 'dashboard/components-next/button/Button';
import { useOptionalConversation } from 'dashboard/conversation/ConversationContext';
import { t } from '../../i18n';
import type { CallLogData, CallTone } from './callLog';
import { useCallSession } from './callSession';
import { useCallsEnabled } from './useCallsEnabled';

const CALL_BACK_TONES: Partial<Record<CallTone, { ruby?: boolean; slate?: boolean }>> = {
    danger: { ruby: true },
};

// Gọi lại một cuộc gọi 1-1 đúng kiểu cũ (thoại/video): đỏ ở cuộc gọi nhỡ/thất bại, trung tính ở
// chỗ khác. Phòng thoại và cuộc gọi nhóm có nút Tham gia ngay trên thẻ.
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
    const callsEnabled = useCallsEnabled();

    if (!conversation || !selected) return null;

    const callBackTone = CALL_BACK_TONES[tone] ?? { slate: true };
    const callBack = (icon: string, onClick: () => void) => (
        <Button type="button" size={size} faded {...callBackTone} icon={icon} label={t('CALLS.DIRECT.CALL_BACK')} className={className} onClick={onClick} />
    );

    if (!callsEnabled || call.kind !== 'direct') return null;

    const media = call.media === 'video' ? 'video' : 'audio';

    return callBack(media === 'video' ? 'i-lucide-video' : 'i-lucide-phone', () =>
        session.startDirectCall({ accountId: conversation.accountId, conversation: selected, media }),
    );
}
