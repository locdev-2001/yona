import { messageTimestamp } from 'shared/helpers/timeHelper';
import Icon from 'dashboard/components-next/icon/Icon';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';
import { MESSAGE_STATUS, MESSAGE_TYPES } from './constants';
import MessageStatus from './MessageStatus';
import { useMessageContext } from './provider';

// Port từ dashboard/components-next/message/MessageMeta.vue. Bản gốc liệt kê từng
// kênh (isAPIInbox / isAWhatsAppChannel / …); ở đây hỏi NĂNG LỰC thay vì loại kênh
// (docs/channel-capabilities.md §3): kênh nào khai `event_delivered`/`event_seen`
// thì dùng status thật, kênh không khai vẫn là đồng hồ xoay như trước.
const LEFT_YONA_STATUSES: string[] = [MESSAGE_STATUS.SENT, MESSAGE_STATUS.DELIVERED, MESSAGE_STATUS.READ];

// `showTime = false`: dòng dưới tin cuối nhóm chỉ còn khoá ghi chú và trạng thái
// gửi; giờ đã có ở tooltip bong bóng và mốc thời gian giữa các nhóm.
export default function MessageMeta({ className = '', showTime = true }: { className?: string; showTime?: boolean }) {
    const { createdAt, status, isPrivate, messageType, contentAttributes, inboxCapabilities } =
        useMessageContext();
    const inbox = { capabilities: inboxCapabilities };
    const hasDeliveryReceipts = inboxSupports(inbox, 'event_delivered');
    const hasReadReceipts = inboxSupports(inbox, 'event_seen');

    const readableTime = messageTimestamp(createdAt, 'LLL d, h:mm a');

    const showStatusIndicator = (() => {
        if (isPrivate) return false;
        if (status === MESSAGE_STATUS.FAILED) return false;
        if (contentAttributes.deleted) return false;
        return messageType === MESSAGE_TYPES.OUTGOING || messageType === MESSAGE_TYPES.TEMPLATE;
    })();

    const statusToShow = (() => {
        if (hasReadReceipts && status === MESSAGE_STATUS.READ) return MESSAGE_STATUS.READ;
        if (hasDeliveryReceipts && status === MESSAGE_STATUS.DELIVERED) return MESSAGE_STATUS.DELIVERED;
        // Không bao giờ hiện dấu mà kênh không chứng thực được: trạng thái cao hơn
        // mức kênh khai (ví dụ `read` trên kênh chỉ có biên nhận giao) lùi về một
        // tick "đã rời khỏi Yona" — điều duy nhất tự mình biết chắc. Kênh không có
        // biên nhận nào thì vẫn là đồng hồ xoay như trước khi gate theo năng lực.
        const hasLeftYona = status !== null && LEFT_YONA_STATUSES.includes(status);

        if ((hasDeliveryReceipts || hasReadReceipts) && hasLeftYona) return MESSAGE_STATUS.SENT;

        return MESSAGE_STATUS.PROGRESS;
    })();

    if (!showTime && !isPrivate && !showStatusIndicator) return null;

    return (
        <div className={`text-xs flex items-center gap-1.5 ${className}`}>
            {showTime ? (
                <div className="inline">
                    <time className="inline">{readableTime}</time>
                </div>
            ) : null}
            {isPrivate ? <Icon icon="i-lucide-lock-keyhole" className="size-3" /> : null}
            {showStatusIndicator ? <MessageStatus status={statusToShow} /> : null}
        </div>
    );
}
