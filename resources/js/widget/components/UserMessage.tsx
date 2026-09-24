import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import FailedSendNotice from './message/FailedSendNotice';
import MessageRow from './message/MessageRow';
import type { WidgetMessage } from '../types';

interface UserMessageProps {
    message: WidgetMessage;
    replyTo?: WidgetMessage | null;
    position?: MessageGroupPosition;
}

// Tin của khách: nằm bên phải, nền đặc. Tin gửi hỏng có khối lỗi kèm "Thử lại".
export default function UserMessage({ message, replyTo = null, position = 'single' }: UserMessageProps) {
    return (
        <MessageRow
            message={message}
            replyTo={replyTo}
            isOwn
            position={position}
            footer={<FailedSendNotice message={message} />}
        />
    );
}
