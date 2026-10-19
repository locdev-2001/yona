import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { UIEvent } from 'react';
import { usePage } from '@inertiajs/react';

import MessageList from 'dashboard/components-next/message/MessageList';
import { collectMediaAttachments } from 'dashboard/components-next/message/helpers/attachments';
import Loader from 'shared/components/loader/Loader';
import Modal from 'dashboard/components/Modal';
import { findIntegrationApp, useIntegrationApps } from 'dashboard/composables/useIntegrationApps';
import AddCanned from 'dashboard/settings/canned/AddCanned';
import { useTypingUsers } from 'dashboard/realtime/hooks';
import { getTypingUsersText } from 'dashboard/helper/conversationHelper';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';

import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { useGroupMembers } from '../groupMembersApi';
import type { ConversationMessage } from '../types';
import { useFocusMessageScroll } from './useFocusMessageScroll';
import { useScrollToLatest } from './useScrollToLatest';
import ScrollToLatestButton from './ScrollToLatestButton';
import { firstUnreadMessageId, unreadCountToShow, unreadMessageLabelParts, unreadSnapshotOf } from '../unreadHelpers';
import Banner from './Banner';
import ForwardMessageDialog from './ForwardMessageDialog';
import MessageTranslationDialog from './MessageTranslationDialog';
import ReplyBox from './ReplyBox';
import ResizableEditorWrapper from './ResizableEditorWrapper';
import type { ResizableEditorWrapperHandle } from './ResizableEditorWrapper';
import { useMessageReply } from './useMessageReply';

// Port từ dashboard/components/widgets/conversation/MessagesView.vue — rút về
// kênh API. Bỏ: label suggestions (EE), referral bubble (WhatsApp), banner
// Instagram. markMessagesRead do ConversationContext gọi (B8). Typing bubble đọc useTypingUsers (store
// conversationTypingStatus gốc). SCROLL_TO_MESSAGE khi có tin mới (ADD_MESSAGE
// gốc emit bus) = effect theo id tin cuối. ResizableEditorWrapper port thật
// (kéo thả + ⤢ + reset sau gửi); containerHeight/topBannerHeight đo bằng
// ResizeObserver thay useElementSize. Danh sách media cho gallery gom từ các tin
// đang nạp (mutation ADD_CONVERSATION_ATTACHMENTS gốc); `fetchAllAttachments`
// chưa port vì backend B9 chưa mở endpoint `conversations/:id/attachments` —
// hệ quả: gallery chỉ duyệt media của các tin đã tải, không phải cả hội thoại.

export default function MessagesView() {
    const {
        accountId,
        conversationId,
        selectedConversation,
        messages,
        messagesLoading,
        allMessagesLoaded,
        fetchPreviousMessages,
        retryFailedMessage,
        toggleMessageReaction,
        deleteConversationMessage,
        focusedMessageId,
        clearFocusedMessage,
        focusMessage,
        markMessagesRead,
    } = useConversation();
    const { auth, inboxes = [] } = usePage<DashboardPageProps>().props;

    const conversationPanelRef = useRef<HTMLUListElement>(null);
    const messagesViewRef = useRef<HTMLDivElement>(null);
    const topBannerRef = useRef<HTMLDivElement>(null);
    const resizableEditorWrapperRef = useRef<ResizableEditorWrapperHandle>(null);
    const [containerHeight, setContainerHeight] = useState(0);
    const [topBannerHeight, setTopBannerHeight] = useState(0);
    const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
    const [forwardingMessage, setForwardingMessage] = useState<ConversationMessage | null>(null);
    const [cannedSourceMessage, setCannedSourceMessage] = useState<ConversationMessage | null>(null);
    const [translatingMessage, setTranslatingMessage] = useState<ConversationMessage | null>(null);
    const { apps: integrationApps } = useIntegrationApps(accountId);
    const isTranslationEnabled = Boolean(findIntegrationApp(integrationApps, 'google_translate')?.enabled);
    // Giữ vị trí scroll sau khi prepend tin cũ: đo scrollHeight trước/sau như bản gốc.
    const scrollRestoreRef = useRef<{ heightBeforeLoad: number; scrollTopBeforeLoad: number } | null>(null);
    const scrolledConversationRef = useRef<number | null>(null);

    const currentChat = selectedConversation!;
    const galleryAttachments = useMemo(() => collectMediaAttachments(messages), [messages]);
    const typingUsersList = useTypingUsers(currentChat.id);
    const isAnyoneTyping = typingUsersList.length !== 0;
    const typingUserNames = (() => {
        if (!isAnyoneTyping) return '';
        const [i18nKey, params] = getTypingUsersText(typingUsersList);
        return t(i18nKey, params);
    })();
    const inbox = inboxes.find((item) => item.id === currentChat.inbox_id) as
        | {
              id: number;
              name: string;
              channel_type: string;
              capabilities?: readonly string[];
              reauthorization_required?: boolean;
              additional_attributes?: {
                  agent_reply_time_window?: string | number;
                  agent_reply_time_window_message?: string;
              };
          }
        | undefined;
    // Một lần nạp cho cả hai nơi: tên người thả cảm xúc và gợi ý nhắc tên khi trả lời.
    const { members: groupMembers } = useGroupMembers(accountId, currentChat.id, inboxSupports(inbox, 'group_threads'));

    const { replyTarget, startReply, clearReply, replyTargets } = useMessageReply({
        accountId,
        conversationId,
        messages,
        enabled: inboxSupports(inbox, 'outbound_reply_to'),
    });

    const replyWindowBannerMessage = (() => {
        const additionalAttributes = inbox?.additional_attributes ?? {};
        return (
            additionalAttributes.agent_reply_time_window_message ||
            t('CONVERSATION.API_HOURS_WINDOW', { hours: additionalAttributes.agent_reply_time_window ?? '' })
        );
    })();

    // Số chưa đọc lúc mở hội thoại: danh sách tắt chấm ngay khi mở, còn dải
    // "N tin chưa đọc" vẫn đánh dấu đúng chỗ bắt đầu đọc tới khi chuyển hội thoại.
    const [unreadAtOpen, setUnreadAtOpen] = useState(() => unreadSnapshotOf(currentChat));
    if (unreadAtOpen.conversationId !== currentChat.id) setUnreadAtOpen(unreadSnapshotOf(currentChat));
    // Focus vào ô soạn là đã đọc tới đó: dải chưa đọc ẩn, và phát sự kiện đã xem
    // chung khi danh sách còn chấm (tin tới lúc tab không được nhìn).
    const readOnComposerFocus = () => {
        setUnreadAtOpen((current) => (current.count > 0 ? { ...current, count: 0 } : current));
        if (currentChat.unread_count > 0) void markMessagesRead(currentChat.id);
    };
    const unreadMessageCount = unreadCountToShow(unreadAtOpen, messages);
    const firstUnreadId = firstUnreadMessageId(messages, unreadAtOpen.lastSeenAt, unreadMessageCount);
    const unreadLabelParts = unreadMessageLabelParts(unreadMessageCount);
    const unreadMessageLabel = `${unreadLabelParts.count} ${t(unreadLabelParts.i18nKey)}`;

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
        currentUserId: auth.user?.id ?? null,
    });

    // Hộp chuyển tiếp gắn với tin của hội thoại đang mở.
    useEffect(() => {
        setForwardingMessage(null);
        setCannedSourceMessage(null);
        setTranslatingMessage(null);
    }, [conversationId]);

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
                {inbox?.reauthorization_required && (
                    <Banner
                        colorScheme="alert"
                        className="mx-2 mt-2 overflow-hidden rounded-lg"
                        bannerMessage={t('SIDEBAR.REAUTHORIZE')}
                    />
                )}
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
                inboxCapabilities={inbox?.capabilities ?? []}
                chatAttachments={galleryAttachments}
                firstUnreadId={firstUnreadId}
                onScroll={handleScroll}
                onRetry={retryFailedMessage}
                onToggleReaction={toggleMessageReaction}
                onDeleteMessage={deleteConversationMessage}
                replyTargets={replyTargets}
                onReplyTo={startReply}
                onForward={setForwardingMessage}
                onCreateCannedResponse={setCannedSourceMessage}
                onTranslate={isTranslationEnabled ? setTranslatingMessage : undefined}
                onJumpToMessage={focusMessage}
                groupMembers={groupMembers}
                beforeAll={
                    <li className="min-h-[4rem] flex flex-shrink-0 flex-grow-0 items-center flex-auto justify-center max-w-full mt-0 mr-0 mb-1 ml-0 relative first:mt-auto last:mb-0">
                        {shouldShowSpinner && <Loader className="text-n-brand" />}
                    </li>
                }
                unreadBadge={
                    <li className="list-none flex justify-center items-center">
                        <span className="rounded-full bg-n-brand text-white text-xs font-medium my-2.5 mx-auto px-2.5 py-1.5">
                            {unreadMessageLabel}
                        </span>
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
                <div className="contents" onFocusCapture={readOnComposerFocus}>
                    <ResizableEditorWrapper
                        ref={resizableEditorWrapperRef}
                        containerHeight={Math.max(0, containerHeight - topBannerHeight)}
                    >
                        <ReplyBox
                            onToggleEditorSize={() => resizableEditorWrapperRef.current?.toggleEditorExpand()}
                            onMessageSent={() => resizableEditorWrapperRef.current?.scheduleResetAfterSend()}
                            replyTarget={replyTarget}
                            onClearReplyTarget={clearReply}
                            groupMembers={groupMembers}
                        />
                    </ResizableEditorWrapper>
                </div>
            </div>
            <Modal show={cannedSourceMessage !== null} onClose={() => setCannedSourceMessage(null)}>
                {cannedSourceMessage && (
                    <AddCanned
                        accountId={accountId}
                        initialContent={cannedSourceMessage.content ?? ''}
                        onCreated={() => undefined}
                        onClose={() => setCannedSourceMessage(null)}
                    />
                )}
            </Modal>
            {translatingMessage && (
                <MessageTranslationDialog
                    accountId={accountId}
                    conversationId={conversationId}
                    message={translatingMessage}
                    onClose={() => setTranslatingMessage(null)}
                />
            )}
            {forwardingMessage && (
                <ForwardMessageDialog
                    accountId={accountId}
                    conversationId={conversationId}
                    message={forwardingMessage}
                    onClose={() => setForwardingMessage(null)}
                />
            )}
        </div>
    );
}
