import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { isToday, isYesterday } from 'date-fns';

import Spinner from 'shared/components/Spinner';

import { MESSAGE_TYPE } from '../helpers/constants';
import { groupMessagesByDate } from '../helpers/messageHelpers';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import AgentMessage from './AgentMessage';
import MessageMeta from './message/MessageMeta';
import UserMessage from './UserMessage';
import type { PositionedMessage, WidgetMessage } from '../types';

// Luồng tin: ngăn cách ngày, rồi các nhóm tin liên tiếp cùng người gửi; mốc giờ
// và trạng thái chỉ đứng dưới tin cuối mỗi nhóm.

function DateSeparator({ date }: { date: string }) {
    const dateValue = new Date(date);
    const label = isToday(dateValue) ? t('TODAY') : isYesterday(dateValue) ? t('YESTERDAY') : date;

    return (
        <div className="yona-date-separator my-2 flex items-center gap-[10px]" role="separator">
            <span className="h-px flex-1 bg-[var(--yona-chat-line-strong)] opacity-50" />
            <span className="whitespace-nowrap text-[10.5px] font-medium leading-none text-[var(--yona-chat-ink-muted)]">
                {label}
            </span>
            <span className="h-px flex-1 bg-[var(--yona-chat-line-strong)] opacity-50" />
        </div>
    );
}

function AgentTypingBubble() {
    return (
        <div className="agent-message-wrap sticky bottom-1">
            <div className="agent-message">
                <div className="avatar-wrap" />
                <div className="message-wrap mt-2">
                    <div className="chat-bubble agent typing-bubble bg-n-background dark:bg-n-solid-3">
                        <img
                            src="/assets/images/dashboard/typing.gif"
                            alt="Agent is typing a message"
                            className="!w-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function MessageGroup({
    messages,
    allMessages,
}: {
    messages: PositionedMessage[];
    allMessages: Record<string, WidgetMessage>;
}) {
    const lastMessage = messages[messages.length - 1].message;
    const isOwn = lastMessage.message_type === MESSAGE_TYPE.INCOMING;

    return (
        <div className={`yona-msg-group mb-[10px] flex flex-col gap-[2px] ${isOwn ? 'items-stretch' : ''}`}>
            {messages.map(({ message, position }, index) => {
                const inReplyTo = message.content_attributes?.in_reply_to;
                const replyTo = inReplyTo ? (allMessages[inReplyTo] ?? null) : null;

                return message.message_type === MESSAGE_TYPE.INCOMING ? (
                    <UserMessage key={message.id} message={message} replyTo={replyTo} position={position} />
                ) : (
                    <AgentMessage
                        key={message.id}
                        message={message}
                        replyTo={replyTo}
                        position={position}
                        showAvatar={index === messages.length - 1}
                    />
                );
            })}
            <MessageMeta message={lastMessage} isOwn={isOwn} />
        </div>
    );
}

export default function ConversationWrap() {
    const conversations = useWidgetState(state => state.conversations);
    const isFetchingList = useWidgetState(state => state.uiFlags.isFetchingList);
    const allMessagesLoaded = useWidgetState(state => state.uiFlags.allMessagesLoaded);
    const isAgentTyping = useWidgetState(state => state.uiFlags.isAgentTyping);
    const conversationStatus = useWidgetState(state => state.conversationAttributes.status);
    const darkMode = useWidgetState(state => state.appConfig.darkMode);

    const containerRef = useRef<HTMLDivElement>(null);
    const previousScrollHeight = useRef(0);
    const previousConversationSize = useRef(0);

    const messages = useMemo(() => Object.values(conversations), [conversations]);
    const messagesByDay = useMemo(() => groupMessagesByDate(messages), [messages]);

    const lastMessage = messages[messages.length - 1];
    const showStatusIndicator =
        isAgentTyping || (conversationStatus === 'pending' && lastMessage?.message_type === MESSAGE_TYPE.INCOMING);

    // ConversationWrap.vue: cuộn đáy khi số tin đổi, bù scrollHeight khi tải tin cũ.
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        if (previousConversationSize.current === messages.length) return;

        previousConversationSize.current = messages.length;
        container.scrollTop = container.scrollHeight - previousScrollHeight.current;
        previousScrollHeight.current = 0;
    }, [messages.length]);

    useEffect(() => {
        previousScrollHeight.current = 0;
    }, [allMessagesLoaded]);

    const handleScroll = () => {
        const container = containerRef.current;
        if (!container) return;
        if (isFetchingList || allMessagesLoaded || !messages.length) return;

        if (container.scrollTop < 100) {
            previousScrollHeight.current = container.scrollHeight;
            void widgetStore.fetchOldConversations({ before: messages[0].id });
        }
    };

    return (
        <div
            ref={containerRef}
            className={`conversation--container ${darkMode === 'dark' ? 'dark-scheme' : 'light-scheme'}`}
            onScroll={handleScroll}
        >
            <div className={`conversation-wrap ${isAgentTyping ? 'is-typing' : ''}`.trim()}>
                {isFetchingList ? (
                    <div className="message--loader">
                        <Spinner size="" />
                    </div>
                ) : null}
                {messagesByDay.map(day => (
                    <div key={day.date} className="messages-wrap">
                        <DateSeparator date={day.date} />
                        {day.groups.map(group => (
                            <MessageGroup key={group[0].message.id} messages={group} allMessages={conversations} />
                        ))}
                    </div>
                ))}
                {showStatusIndicator ? <AgentTypingBubble /> : null}
            </div>
        </div>
    );
}
