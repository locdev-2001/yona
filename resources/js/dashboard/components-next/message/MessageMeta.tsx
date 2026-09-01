import { messageTimestamp } from 'shared/helpers/timeHelper';
import Icon from 'dashboard/components-next/icon/Icon';
import { MESSAGE_STATUS, MESSAGE_TYPES } from './constants';
import MessageStatus from './MessageStatus';
import { useMessageContext } from './provider';

// Port từ dashboard/components-next/message/MessageMeta.vue — B3 chỉ có kênh
// API nên các nhánh WhatsApp/Twilio/FB/Line/Email... chưa port (đi cùng driver F).
export default function MessageMeta({ className = '' }: { className?: string }) {
    const { createdAt, status, isPrivate, messageType, contentAttributes, channelType } = useMessageContext();
    const isApiInbox = channelType === 'Channel::Api';

    const readableTime = messageTimestamp(createdAt, 'LLL d, h:mm a');

    const showStatusIndicator = (() => {
        if (isPrivate) return false;
        if (status === MESSAGE_STATUS.FAILED) return false;
        if (contentAttributes.deleted) return false;
        return messageType === MESSAGE_TYPES.OUTGOING || messageType === MESSAGE_TYPES.TEMPLATE;
    })();

    // API inbox dùng status thật sent/delivered/read từ hệ ngoài.
    const statusToShow = (() => {
        if (!isApiInbox) return MESSAGE_STATUS.PROGRESS;
        if (status === MESSAGE_STATUS.READ) return MESSAGE_STATUS.READ;
        if (status === MESSAGE_STATUS.DELIVERED) return MESSAGE_STATUS.DELIVERED;
        if (status === MESSAGE_STATUS.SENT) return MESSAGE_STATUS.SENT;
        return MESSAGE_STATUS.PROGRESS;
    })();

    return (
        <div className={`text-xs flex items-center gap-1.5 ${className}`}>
            <div className="inline">
                <time className="inline">{readableTime}</time>
            </div>
            {isPrivate ? <Icon icon="i-lucide-lock-keyhole" className="size-3" /> : null}
            {showStatusIndicator ? <MessageStatus status={statusToShow} /> : null}
        </div>
    );
}
