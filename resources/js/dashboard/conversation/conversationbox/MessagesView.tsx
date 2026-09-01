import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, UIEvent } from 'react';
import { usePage } from '@inertiajs/react';

import MessageList from 'dashboard/components-next/message/MessageList';
import Spinner from 'dashboard/components-next/spinner/Spinner';

import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import Banner from './Banner';
import ReplyBox from './ReplyBox';

// Port từ dashboard/components/widgets/conversation/MessagesView.vue — rút về
// kênh API. Bỏ ở B3: typing indicator (B4), label suggestions (EE), referral
// bubble (WhatsApp), banner Instagram, markMessagesRead (B5), scroll-to-message
// qua bus. ResizableEditorWrapper chỉ giữ wrapper class + biến chiều cao mặc
// định (120px như DEFAULT_HEIGHT gốc), không kéo thả.

export default function MessagesView() {
    const {
        selectedConversation,
        messages,
        messagesLoading,
        allMessagesLoaded,
        fetchPreviousMessages,
    } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;

    const conversationPanelRef = useRef<HTMLUListElement>(null);
    const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
    // Giữ vị trí scroll sau khi prepend tin cũ: đo scrollHeight trước/sau như bản gốc.
    const scrollRestoreRef = useRef<{ heightBeforeLoad: number; scrollTopBeforeLoad: number } | null>(null);
    const scrolledConversationRef = useRef<number | null>(null);

    const currentChat = selectedConversation!;
    const inbox = inboxes.find((item) => item.id === currentChat.inbox_id) as
        | {
              id: number;
              name: string;
              channel_type: string;
              additional_attributes?: {
                  agent_reply_time_window?: string | number;
                  agent_reply_time_window_message?: string;
              };
          }
        | undefined;

    const replyWindowBannerMessage = (() => {
        const additionalAttributes = inbox?.additional_attributes ?? {};
        return (
            additionalAttributes.agent_reply_time_window_message ||
            t('CONVERSATION.API_HOURS_WINDOW', { hours: additionalAttributes.agent_reply_time_window ?? '' })
        );
    })();

    const unreadMessageCount = currentChat.unread_count || 0;
    const unReadMessages = messages.filter(
        (message) => message.created_at * 1000 > currentChat.agent_last_seen_at * 1000,
    );
    const firstUnreadId = unreadMessageCount !== 0 ? (unReadMessages[0]?.id ?? null) : null;

    const unreadMessageLabel = (() => {
        const count = unreadMessageCount > 9 ? '9+' : unreadMessageCount;
        const label = unreadMessageCount > 1 ? 'CONVERSATION.UNREAD_MESSAGES' : 'CONVERSATION.UNREAD_MESSAGE';
        return `${count} ${t(label)}`;
    })();

    const shouldShowSpinner = messagesLoading || isLoadingPrevious;

    // Mở conversation → sau khi nạp xong tin thì cuộn xuống đáy;
    // prepend tin cũ → bù lại đúng khoảng scroll cũ.
    useLayoutEffect(() => {
        const panel = conversationPanelRef.current;
        if (!panel) return;

        if (scrollRestoreRef.current) {
            const { heightBeforeLoad, scrollTopBeforeLoad } = scrollRestoreRef.current;
            panel.scrollTop = scrollTopBeforeLoad + (panel.scrollHeight - heightBeforeLoad);
            scrollRestoreRef.current = null;
            return;
        }

        if (!messagesLoading && messages.length && scrolledConversationRef.current !== currentChat.id) {
            panel.scrollTop = panel.scrollHeight;
            scrolledConversationRef.current = currentChat.id;
        }
    }, [messages, messagesLoading, currentChat.id]);

    const handleScroll = (event: UIEvent<HTMLUListElement>) => {
        const panel = event.currentTarget;
        if (panel.scrollTop >= 100 || isLoadingPrevious || messagesLoading || allMessagesLoaded) return;

        setIsLoadingPrevious(true);
        const snapshot = { heightBeforeLoad: panel.scrollHeight, scrollTopBeforeLoad: panel.scrollTop };
        fetchPreviousMessages()
            .then((loadedCount) => {
                if (loadedCount > 0) scrollRestoreRef.current = snapshot;
            })
            .catch(() => undefined)
            .finally(() => setIsLoadingPrevious(false));
    };

    return (
        <div className="flex flex-col justify-between flex-grow h-full min-w-0 m-0">
            <div>
                {!currentChat.can_reply && (
                    <Banner
                        colorScheme="alert"
                        className="mx-2 mt-2 overflow-hidden rounded-lg"
                        bannerMessage={replyWindowBannerMessage}
                    />
                )}
            </div>
            <MessageList
                ref={conversationPanelRef}
                className="conversation-panel flex-shrink flex-grow basis-px flex flex-col overflow-y-auto relative h-full m-0 pb-4"
                messages={messages}
                channelType={inbox?.channel_type ?? null}
                firstUnreadId={firstUnreadId}
                onScroll={handleScroll}
                beforeAll={
                    <li className="min-h-[4rem] flex flex-shrink-0 flex-grow-0 items-center flex-auto justify-center max-w-full mt-0 mr-0 mb-1 ml-0 relative first:mt-auto last:mb-0">
                        {shouldShowSpinner && <Spinner className="text-n-brand" />}
                    </li>
                }
                unreadBadge={
                    <li className="list-none flex justify-center items-center">
                        <span className="shadow-lg rounded-full bg-n-brand text-white text-xs font-medium my-2.5 mx-auto px-2.5 py-1.5">
                            {unreadMessageLabel}
                        </span>
                    </li>
                }
            />
            <div className="flex relative flex-col bg-n-surface-1">
                <div
                    className="relative resizable-editor-wrapper"
                    style={{ '--editor-height': '7.5rem' } as CSSProperties}
                >
                    {/* Thanh grip của ResizableEditorWrapper — giữ pixel, chưa kéo thả. */}
                    <div className="group absolute inset-x-0 -top-4 z-10 flex h-4 select-none items-center justify-center bg-gradient-to-b from-transparent from-10% dark:to-n-surface-1/80 to-n-surface-1/90 backdrop-blur-[0.01875rem]">
                        <div className="w-8 h-0.5 mt-1 rounded-full bg-n-slate-6 transition-all duration-200" />
                    </div>
                    <ReplyBox />
                </div>
            </div>
        </div>
    );
}
