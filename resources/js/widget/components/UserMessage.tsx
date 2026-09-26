import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';
import { resolveStructured, StructuredMessageView } from 'shared/messaging';

import CancelSendButton from './message/CancelSendButton';
import FailedSendNotice from './message/FailedSendNotice';
import MessageRow from './message/MessageRow';
import { messageElementId } from './message/QuotedReply';
import type { WidgetMessage } from '../types';

interface UserMessageProps {
    message: WidgetMessage;
    replyTo?: WidgetMessage | null;
    position?: MessageGroupPosition;
}

// Tin của khách: nằm bên phải, nền đặc. Tin nhiều tệp đang tải có nút "Huỷ gửi"; tin gửi
// hỏng có khối lỗi kèm "Thử lại".
export default function UserMessage({ message, replyTo = null, position = 'single' }: UserMessageProps) {
    // Tin có cấu trúc khách gửi (yêu cầu đặt hàng) do message kit vẽ, căn phải.
    const structured = resolveStructured(message);

    if (structured?.definition.side === 'contact') {
        return (
            <div className="flex flex-col items-end gap-1" id={messageElementId(message.id)}>
                <StructuredMessageView resolved={structured} message={message} />
                <FailedSendNotice message={message} />
            </div>
        );
    }

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
