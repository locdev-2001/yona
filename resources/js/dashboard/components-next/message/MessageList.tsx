import { forwardRef, Fragment, useMemo } from 'react';
import { messageSentAt } from 'dashboard/conversation/messageTime';
import type { ReactNode, UIEventHandler } from 'react';
import { fromUnixTime, isToday } from 'date-fns';

import type { GroupMember } from 'dashboard/conversation/groupMembersApi';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { needsTimeDivider, resolveGroupPositions } from 'shared/helpers/messageGrouping';
import type { GroupableMessage } from 'shared/helpers/messageGrouping';
import { messageStamp, messageTimestamp } from 'shared/helpers/timeHelper';

import Message from './Message';
import { MESSAGE_STATUS, MESSAGE_TYPES } from './constants';
import type { MessageAttachment } from './helpers/attachments';
import { createReactorNameResolver } from './helpers/reactions';
import { readInReplyToId } from './helpers/replyQuote';
import { messageSenderKey } from './helpers/senderIdentity';
import { callNoticeSide } from './helpers/callNotice';
import { withoutSupersededStartNotices } from 'dashboard/calls/callLog';

// Port từ dashboard/components-next/message/MessageList.vue — slot Vue
// (beforeAll/unreadBadge/after) thành props ReactNode; gộp nhóm tin và mốc thời
// gian theo luật dùng chung ở shared/helpers/messageGrouping. Bỏ ở B3: retry (chưa có sendMessageWithData ở spine).
// Tin được trả lời nằm ngoài trang đang tải do nơi dựng danh sách tra riêng và
// truyền vào qua `replyTargets`.

interface MessageListProps {
    messages: ConversationMessage[];
    channelType: string | null;
    inboxCapabilities?: readonly string[];
    // Danh sách media của cả hội thoại (gallery) — getter store bên gốc.
    chatAttachments?: MessageAttachment[];
    firstUnreadId?: number | null;
    className?: string;
    beforeAll?: ReactNode;
    unreadBadge?: ReactNode;
    after?: ReactNode;
    onScroll?: UIEventHandler<HTMLUListElement>;
    onRetry?: (message: ConversationMessage) => Promise<void> | void;
    onToggleReaction?: (message: ConversationMessage, emoji: string) => Promise<void> | void;
    onDeleteMessage?: (message: ConversationMessage) => Promise<void> | void;
    // Tin gốc nằm ngoài danh sách đã tra: message = có, null = không tồn tại.
    replyTargets?: ReadonlyMap<number, ConversationMessage | null>;
    onReplyTo?: (message: ConversationMessage) => void;
    onForward?: (message: ConversationMessage) => void;
    onCreateCannedResponse?: (message: ConversationMessage) => void;
    onTranslate?: (message: ConversationMessage) => void;
    onJumpToMessage?: (messageId: number) => void;
    // Danh bạ hội thoại nhóm: đặt tên cho người thả cảm xúc chưa từng nhắn tin.
    groupMembers?: readonly GroupMember[];
}

const NO_GROUP_MEMBERS: readonly GroupMember[] = [];

const NO_REPLY_TARGETS: ReadonlyMap<number, ConversationMessage | null> = new Map();

const STANDALONE_MESSAGE_TYPES: number[] = [MESSAGE_TYPES.TEMPLATE, MESSAGE_TYPES.ACTIVITY];

// Quy tin của hộp thư về dạng luật gộp nhóm dùng chung hiểu được: khác loại tin
// (khách/nhân viên) là khác người gửi; tin lỗi, tin mẫu, tin hoạt động đứng riêng. Tin cuộc gọi
// có người khởi tạo gộp cụm với tin của người đó như tin đi/tin đến thường.
function toGroupableMessage(message: ConversationMessage): GroupableMessage {
    const noticeSide = callNoticeSide(message);
    const groupedType = noticeSide === null ? message.message_type : noticeSide === 'own' ? MESSAGE_TYPES.OUTGOING : MESSAGE_TYPES.INCOMING;

    return {
        senderKey: `${groupedType}:${messageSenderKey(message) ?? ''}`,
        createdAt: messageSentAt(message),
        standalone:
            message.status === MESSAGE_STATUS.FAILED || (noticeSide === null && STANDALONE_MESSAGE_TYPES.includes(message.message_type)),
    };
}

function timeDividerLabel(createdAt: number): string {
    return isToday(fromUnixTime(createdAt)) ? messageStamp(createdAt) : messageTimestamp(createdAt, 'LLL d, h:mm a');
}

/**
 * Tin được trả lời: tra trong danh sách đang hiển thị trước, rồi tới các tin đã
 * tra riêng. `content_attributes.in_reply_to` do lõi đặt (Message#ensureInReplyTo),
 * nên mọi kênh dùng chung một đường. undefined = chưa biết (đang tải hoặc không trả lời).
 */
function findInReplyTo(
    message: ConversationMessage,
    messages: ConversationMessage[],
    replyTargets: ReadonlyMap<number, ConversationMessage | null> = NO_REPLY_TARGETS,
): ConversationMessage | null | undefined {
    const inReplyToId = readInReplyToId(message.content_attributes ?? {});

    if (inReplyToId === null) return undefined;

    return messages.find(candidate => candidate.id === inReplyToId) ?? replyTargets.get(inReplyToId);
}

function findChoiceOf(message: ConversationMessage, messages: ConversationMessage[]): ConversationMessage | null {
    const questionId = Number(message.content_attributes?.choice_of);

    return questionId ? (messages.find(candidate => candidate.id === questionId) ?? null) : null;
}

const MessageList = forwardRef<HTMLUListElement, MessageListProps>(function MessageList(
    {
        messages,
        channelType,
        inboxCapabilities = [],
        chatAttachments = [],
        firstUnreadId = null,
        className = '',
        beforeAll,
        unreadBadge,
        after,
        onScroll,
        onRetry,
        onToggleReaction,
        onDeleteMessage,
        replyTargets = NO_REPLY_TARGETS,
        onReplyTo,
        onForward,
        onCreateCannedResponse,
        onTranslate,
        onJumpToMessage,
        groupMembers = NO_GROUP_MEMBERS,
    },
    ref,
) {
    // Một sự kiện cuộc gọi một mục: tin bắt đầu đã có thẻ kết thúc thì không vẽ, kể cả khi gộp cụm.
    const visibleMessages = useMemo(() => withoutSupersededStartNotices(messages), [messages]);
    const groupPositions = useMemo(() => resolveGroupPositions(visibleMessages.map(toGroupableMessage)), [visibleMessages]);
    const resolveReactorName = useMemo(
        () => createReactorNameResolver(messages, groupMembers),
        [messages, groupMembers],
    );

    return (
        <ul ref={ref} className={`px-4 bg-n-surface-1 ${className}`} onScroll={onScroll}>
            {beforeAll}
            {visibleMessages.map((message, index) => (
                <Fragment key={message.id}>
                    {firstUnreadId != null && message.id === firstUnreadId && unreadBadge}
                    {needsTimeDivider(index > 0 ? messageSentAt(visibleMessages[index - 1]) : null, messageSentAt(message)) ? (
                        <li
                            data-testid="message-time-divider"
                            className="list-none flex justify-center py-2 text-xs font-medium text-n-slate-11"
                        >
                            <time>{timeDividerLabel(messageSentAt(message))}</time>
                        </li>
                    ) : null}
                    <Message
                        message={message}
                        channelType={channelType}
                        inboxCapabilities={inboxCapabilities}
                        chatAttachments={chatAttachments}
                        groupPosition={groupPositions[index]}
                        resolveReactorName={resolveReactorName}
                        inReplyTo={findInReplyTo(message, messages, replyTargets)}
                        choiceOf={findChoiceOf(message, messages)}
                        onRetry={onRetry}
                        onToggleReaction={onToggleReaction}
                        onDeleteMessage={onDeleteMessage}
                        onReplyTo={onReplyTo}
                        onForward={onForward}
                        onCreateCannedResponse={onCreateCannedResponse}
                        onTranslate={onTranslate}
                        onJumpToMessage={onJumpToMessage}
                    />
                </Fragment>
            ))}
            {after}
        </ul>
    );
});

export default MessageList;
