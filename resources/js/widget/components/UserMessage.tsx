import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import MessageRow from './message/MessageRow';
import type { WidgetMessage } from '../types';

interface UserMessageProps {
    message: WidgetMessage;
    replyTo?: WidgetMessage | null;
    position?: MessageGroupPosition;
}

// Tin của khách: nằm bên phải, nền đặc. Tin chữ gửi hỏng có nút gửi lại.
export default function UserMessage({ message, replyTo = null, position = 'single' }: UserMessageProps) {
    const canRetry = message.status === 'failed' && !message.attachments?.length && message.content_type !== 'sticker';

    return (
        <MessageRow
            message={message}
            replyTo={replyTo}
            isOwn
            position={position}
            footer={
                canRetry ? (
                    <button
                        type="button"
                        title={t('COMPONENTS.MESSAGE_BUBBLE.RETRY')}
                        aria-label={t('COMPONENTS.MESSAGE_BUBBLE.RETRY')}
                        className="inline-flex h-8 w-8 items-center justify-center text-[var(--yona-chat-danger)]"
                        onClick={() => widgetStore.sendMessageWithData(message)}
                    >
                        <FluentIcon icon="arrow-clockwise" size="14" />
                    </button>
                ) : null
            }
        />
    );
}
