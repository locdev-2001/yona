import { forwardRef, Fragment } from 'react';
import type { ReactNode, UIEventHandler } from 'react';

import type { ConversationMessage } from 'dashboard/conversation/types';

import Message from './Message';
import { MESSAGE_TYPES } from './constants';
import type { MessageAttachment } from './helpers/attachments';

// Port từ dashboard/components-next/message/MessageList.vue — slot Vue
// (beforeAll/unreadBadge/after) thành props ReactNode; grouping tính trực tiếp
// trên payload snake_case. Bỏ ở B3: fetch tin in_reply_to qua API (B9),
// retry (chưa có sendMessageWithData ở spine), inboxSupportsReplyTo.

interface MessageListProps {
    messages: ConversationMessage[];
    channelType: string | null;
    // Danh sách media của cả hội thoại (gallery) — getter store bên gốc.
    chatAttachments?: MessageAttachment[];
    firstUnreadId?: number | null;
    className?: string;
    beforeAll?: ReactNode;
    unreadBadge?: ReactNode;
    after?: ReactNode;
    onScroll?: UIEventHandler<HTMLUListElement>;
}

function shouldGroupWithNext(index: number, searchList: ConversationMessage[]): boolean {
    if (index === searchList.length - 1) return false;

    const current = searchList[index];
    const next = searchList[index + 1];

    if (next.status === 'failed') return false;

    const nextSenderId = next.sender_id ?? next.sender?.id;
    const currentSenderId = current.sender_id ?? current.sender?.id;
    const hasSameSender = nextSenderId === currentSenderId;

    const areBothTemplates =
        next.message_type === MESSAGE_TYPES.TEMPLATE && current.message_type === MESSAGE_TYPES.TEMPLATE;

    if (!hasSameSender || areBothTemplates) return false;

    if (current.message_type !== next.message_type) return false;

    // Cùng phút (làm tròn xuống theo 60s) mới gộp.
    return Math.floor(next.created_at / 60) === Math.floor(current.created_at / 60);
}

const MessageList = forwardRef<HTMLUListElement, MessageListProps>(function MessageList(
    {
        messages,
        channelType,
        chatAttachments = [],
        firstUnreadId = null,
        className = '',
        beforeAll,
        unreadBadge,
        after,
        onScroll,
    },
    ref,
) {
    return (
        <ul ref={ref} className={`px-4 bg-n-surface-1 ${className}`} onScroll={onScroll}>
            {beforeAll}
            {/* Giữ Message là con trực tiếp của ul như DOM gốc — CSS
                `.group-with-next + .message-bubble-container` cần chúng là sibling. */}
            {messages.map((message, index) => (
                <Fragment key={message.id}>
                    {firstUnreadId != null && message.id === firstUnreadId && unreadBadge}
                    <Message
                        message={message}
                        channelType={channelType}
                        chatAttachments={chatAttachments}
                        groupWithNext={shouldGroupWithNext(index, messages)}
                    />
                </Fragment>
            ))}
            {after}
        </ul>
    );
});

export default MessageList;
