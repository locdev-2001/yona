import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { isToday, isYesterday } from 'date-fns';

import Spinner from 'shared/components/Spinner';

import { MESSAGE_TYPE } from '../helpers/constants';
import { groupMessagesByDate } from '../helpers/messageHelpers';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import AgentMessage from './AgentMessage';
import UserMessage from './UserMessage';
import type { WidgetMessage } from '../types';

// Port từ widget/components/ConversationWrap.vue + ChatMessage.vue +
// AgentTypingBubble.vue + shared/components/DateSeparator.vue.

function DateSeparator({ date }: { date: string }) {
    const dateValue = new Date(date);
    const label = isToday(dateValue) ? t('TODAY') : isYesterday(dateValue) ? t('YESTERDAY') : date;

    return (
        <div className="text-sm text-n-slate-11 h-[50px] leading-[50px] relative text-center w-full before:content-[''] before:h-px before:absolute before:top-6 before:w-[calc((100%-120px)/2)] before:bg-n-slate-4 before:dark:bg-n-slate-6 before:left-0 after:content-[''] after:h-px after:absolute after:top-6 after:w-[calc((100%-120px)/2)] after:bg-n-slate-4 after:dark:bg-n-slate-6 after:right-0">
            {label}
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

function ChatMessage({ message, allMessages }: { message: WidgetMessage; allMessages: Record<string, WidgetMessage> }) {
    const inReplyTo = message.content_attributes?.in_reply_to;
    const replyTo = inReplyTo ? (allMessages[inReplyTo] ?? null) : null;

    return message.message_type === MESSAGE_TYPE.INCOMING ? (
        <UserMessage message={message} replyTo={replyTo} />
    ) : (
        <AgentMessage message={message} replyTo={replyTo} />
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
    const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

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
                {groupedMessages.map(group => (
                    <div key={group.date} className="messages-wrap">
                        <DateSeparator date={group.date} />
                        {group.messages.map(message => (
                            <ChatMessage key={message.id} message={message} allMessages={conversations} />
                        ))}
                    </div>
                ))}
                {showStatusIndicator ? <AgentTypingBubble /> : null}
            </div>
        </div>
    );
}
