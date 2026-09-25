import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import CancelSendButton from './message/CancelSendButton';
import FailedSendNotice from './message/FailedSendNotice';
import MessageRow from './message/MessageRow';
import type { WidgetMessage } from '../types';

interface UserMessageProps {
    message: WidgetMessage;
    replyTo?: WidgetMessage | null;
    position?: MessageGroupPosition;
}

// Tin của khách: nằm bên phải, nền đặc. Tin nhiều tệp đang tải có nút "Huỷ gửi"; tin gửi
// hỏng có khối lỗi kèm "Thử lại".
export default function UserMessage({ message, replyTo = null, position = 'single' }: UserMessageProps) {
    return (
        <MessageRow
            message={message}
            replyTo={replyTo}
            isOwn
            position={position}
            footer={
                <>
                    <CancelSendButton message={message} />
                    <FailedSendNotice message={message} />
                </>
            }
        />
    );
}
