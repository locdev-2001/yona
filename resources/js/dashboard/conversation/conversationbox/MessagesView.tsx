import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { UIEvent } from 'react';

import MessageList from 'dashboard/components-next/message/MessageList';
import { collectMediaAttachments } from 'dashboard/components-next/message/helpers/attachments';
import Loader from 'shared/components/loader/Loader';
import { useTypingUsers } from 'dashboard/realtime/hooks';
import { getTypingUsersText } from 'dashboard/helper/conversationHelper';

import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import { useFocusMessageScroll } from './useFocusMessageScroll';
import { useScrollToLatest } from './useScrollToLatest';
import ScrollToLatestButton from './ScrollToLatestButton';
import Banner from './Banner';
import MessageRequestBanner from './MessageRequestBanner';
import ReplyBox from './ReplyBox';
import ResizableEditorWrapper from './ResizableEditorWrapper';
import type { ResizableEditorWrapperHandle } from './ResizableEditorWrapper';
import { useMessageReply } from './useMessageReply';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import ForwardDialog from './ForwardDialog';
import type { ConversationMessage } from '../types';
import { toMentionable } from '../groupMembersApi';

// Năng lực của cuộc trò chuyện giữa người dùng mà bong bóng tin hỏi tới: dấu đã xem
// và trả lời trích dẫn. Cảm xúc, thu hồi bật khi máy chủ có đường cho chúng.
const CHAT_CAPABILITIES = ['event_seen', 'outbound_reply_to', 'outbound_reaction', 'outbound_recall'] as const;

export default function MessagesView() {
    const {
        currentUserId,
        conversationId,
        selectedConversation,
        messages,
        messagesLoading,
        allMessagesLoaded,
        fetchPreviousMessages,
        retryFailedMessage,
        deleteConversationMessage,
        focusedMessageId,
        clearFocusedMessage,
        focusMessage,
        groupMembers,
        toggleReaction,
        setEditingMessage,
    } = useConversation();
    const forwardDialogRef = useRef<DialogHandle>(null);
    const [forwarding, setForwarding] = useState<ConversationMessage | null>(null);
    const mentionableMembers = useMemo(() => groupMembers.map(toMentionable), [groupMembers]);

    const conversationPanelRef = useRef<HTMLUListElement>(null);
    const messagesViewRef = useRef<HTMLDivElement>(null);
    const topBannerRef = useRef<HTMLDivElement>(null);
    const resizableEditorWrapperRef = useRef<ResizableEditorWrapperHandle>(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const [topBannerHeight, setTopBannerHeight] = useState(0);
    const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
    // Giữ vị trí scroll sau khi prepend tin cũ: đo scrollHeight trước/sau.
    const scrollRestoreRef = useRef<{ heightBeforeLoad: number; scrollTopBeforeLoad: number } | null>(null);
    const scrolledConversationRef = useRef<number | null>(null);

    const currentChat = selectedConversation!;
    const isRequest = currentChat.member_status === 'pending';
    const galleryAttachments = useMemo(() => collectMediaAttachments(messages), [messages]);
    const typingUsersList = useTypingUsers(currentChat.id);
    const isAnyoneTyping = typingUsersList.length !== 0;
    const typingUserNames = (() => {
        if (!isAnyoneTyping) return '';
        const [i18nKey, params] = getTypingUsersText(typingUsersList);
        return t(i18nKey, params);
    })();

    const { replyTarget, startReply, clearReply, replyTargets } = useMessageReply({
        currentUserId,
        conversationId,
        messages,
        enabled: !isRequest,
    });

    const cannotReplyMessage = currentChat.blocked_by_me ? t('CHAT.BLOCK.BANNER_BLOCKED_BY_ME') : t('CHAT.BLOCK.BANNER_CANNOT_REPLY');

    const shouldShowSpinner = messagesLoading || isLoadingPrevious;

    useEffect(() => {
        const messagesView = messagesViewRef.current;
        const topBanner = topBannerRef.current;
        if (!messagesView || !topBanner) return undefined;

        const observer = new ResizeObserver(() => {
            setContainerHeight(messagesView.offsetHeight);
            setTopBannerHeight(topBanner.offsetHeight);
        });
        observer.observe(messagesView);
        observer.observe(topBanner);
        return () => observer.disconnect();
    }, []);

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

    const scrollToLatest = useScrollToLatest({
        panelRef: conversationPanelRef,
        messages,
        conversationId: currentChat.id,
        scrolledConversationRef,
        currentUserId,
    });

    // Đặt sau hai effect cuộn đáy ở trên: layout effect chạy theo thứ tự khai báo.
    useFocusMessageScroll({
        focusedMessageId,
        messages,
        conversationId: currentChat.id,
        scrolledConversationRef,
        onDone: clearFocusedMessage,
    });

    const handleScroll = (event: UIEvent<HTMLUListElement>) => {
        const panel = event.currentTarget;
        scrollToLatest.onScroll(panel);
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
        <div ref={messagesViewRef} className="flex flex-col justify-between flex-grow h-full min-w-0 m-0">
            <div ref={topBannerRef}>
                {!currentChat.can_reply && !isRequest && (
                    <Banner colorScheme="alert" className="mx-2 mt-2 overflow-hidden rounded-lg" bannerMessage={cannotReplyMessage} />
                )}
            </div>
            <MessageList
                ref={conversationPanelRef}
                className="conversation-panel flex-shrink flex-grow basis-px flex flex-col overflow-y-auto relative h-full m-0 pb-4"
                messages={messages}
                channelType={null}
                inboxCapabilities={CHAT_CAPABILITIES}
                groupMembers={mentionableMembers}
                chatAttachments={galleryAttachments}
                firstUnreadId={null}
                onScroll={handleScroll}
                onRetry={retryFailedMessage}
                onDeleteMessage={deleteConversationMessage}
                onToggleReaction={isRequest ? undefined : toggleReaction}
                onEdit={isRequest || !currentChat.can_reply ? undefined : setEditingMessage}
                onForward={message => {
                    setForwarding(message);
                    forwardDialogRef.current?.open();
                }}
                replyTargets={replyTargets}
                onReplyTo={isRequest ? undefined : startReply}
                onJumpToMessage={focusMessage}
                beforeAll={
                    <li className="min-h-[4rem] flex flex-shrink-0 flex-grow-0 items-center flex-auto justify-center max-w-full mt-0 mr-0 mb-1 ml-0 relative first:mt-auto last:mb-0">
                        {shouldShowSpinner && <Loader className="text-n-brand" />}
                    </li>
                }
            />
            <div className="flex relative flex-col bg-n-surface-canvas pb-[env(safe-area-inset-bottom)]">
                {scrollToLatest.isAwayFromLatest ? (
                    <ScrollToLatestButton unseenCount={scrollToLatest.unseenCount} onClick={scrollToLatest.jump} />
                ) : null}
                {isAnyoneTyping && (
                    <div className="absolute flex items-center w-full h-0 -top-7">
                        <div className="flex py-2 pr-4 pl-5 overlay-surface rounded-full text-n-slate-11 text-xs font-semibold my-2.5 mx-auto">
                            {typingUserNames}
                            <img
                                className="w-6 ltr:ml-2 rtl:mr-2"
                                src="/assets/images/dashboard/typing.gif"
                                alt=""
                            />
                        </div>
                    </div>
                )}
                <ForwardDialog ref={forwardDialogRef} message={forwarding} />
                {isRequest ? (
                    <MessageRequestBanner />
                ) : (
                    <ResizableEditorWrapper
                        ref={resizableEditorWrapperRef}
                        containerHeight={Math.max(0, containerHeight - topBannerHeight)}
                    >
                        <ReplyBox
                            onToggleEditorSize={() => resizableEditorWrapperRef.current?.toggleEditorExpand()}
                            onMessageSent={() => resizableEditorWrapperRef.current?.scheduleResetAfterSend()}
                            replyTarget={replyTarget}
                            onClearReplyTarget={clearReply}
                        />
                    </ResizableEditorWrapper>
                )}
            </div>
        </div>
    );
}
