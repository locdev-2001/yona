import { messageStamp } from 'shared/helpers/timeHelper';

import { deliveryStatusOf } from '../../helpers/messageHelpers';
import type { DeliveryStatus } from '../../helpers/messageHelpers';
import { useWidgetState } from '../../store/hooks';
import { t } from '../../i18n';
import type { WidgetMessage } from '../../types';

const DELIVERY_LABEL_KEY: Record<DeliveryStatus, string> = {
    sending: 'DELIVERY.SENDING',
    failed: 'DELIVERY.FAILED',
    sent: 'DELIVERY.SENT',
    delivered: 'DELIVERY.DELIVERED',
    seen: 'DELIVERY.SEEN',
};

// Mốc giờ đứng dưới tin CUỐI của nhóm; tin của khách kèm trạng thái gửi/xem.
export default function MessageMeta({ message, isOwn }: { message: WidgetMessage; isOwn: boolean }) {
    const agentLastSeenAt = useWidgetState(state => state.agentLastSeenAt);
    const photoCount = (message.attachments ?? []).filter(attachment => attachment.file_type === 'image').length;
    const timeLabel = messageStamp(message.created_at);
    const timeWithPhotos = photoCount > 1 ? `${t('ATTACHMENT_STATE.PHOTO_COUNT', { count: photoCount })} · ${timeLabel}` : timeLabel;
    const deliveryStatus = isOwn ? deliveryStatusOf(message, agentLastSeenAt) : null;

    return (
        <div
            className={`yona-msg-meta mt-1 flex items-center gap-[7px] text-[10.5px] leading-none ${
                deliveryStatus === 'failed' ? 'text-[var(--yona-chat-danger)]' : 'text-[var(--yona-chat-ink-muted)]'
            } ${isOwn ? 'justify-end' : 'justify-start ltr:ml-[34px] rtl:mr-[34px]'}`}
        >
            <span>{timeWithPhotos}</span>
            {deliveryStatus ? (
                <>
                    <span aria-hidden="true" className="h-[9px] w-px bg-[var(--yona-chat-line-strong)]" />
                    <span>{t(DELIVERY_LABEL_KEY[deliveryStatus])}</span>
                </>
            ) : null}
        </div>
    );
}
