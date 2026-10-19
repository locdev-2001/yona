import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import { useViewportWidth } from 'dashboard/composables/useViewportWidth';
import { updateUISettings as persistUISettings } from 'dashboard/composables/useUISettings';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import { registerReconnectHandlers } from 'dashboard/realtime/ReconnectService';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import {
    acceptChat,
    blockUser,
    createGroup as createGroupRequest,
    fetchChat,
    fetchChats,
    fetchMessages,
    markChatRead,
    openDirectChat as openDirectChatRequest,
    removeChat,
    reportAbuse,
    sendMessage,
    toggleTyping,
    unblockUser,
} from './api';
import type { AbuseReason } from './api';
import { useGroupMembers } from './groupMembersApi';
import { LAYOUT_TYPES, MESSAGE_STATUS, MESSAGE_TYPES } from './constants';
import { isOnExpandedLayout as computeExpandedLayout } from './layoutMode';
import { readFocusMessageId } from './messageFocus';
import { isUnsentMessageId, markUnsentFailed, markUnsentSending, removeUnsent, withUnsentOf } from './pendingMessages';
import {
    applyIncomingMessage,
    applyMessageToConversation,
    applyReadReceipt,
    sortConversations,
    toViewerConversation,
    toViewerMessage,
    upsertConversation,
} from './realtimeReducers';
import type { OutgoingMention } from 'dashboard/components/widgets/WootWriter/groupMemberMentions';
import type { ChatListTab, Conversation, ConversationListMeta, ConversationMessage, GroupMemberPerson } from './types';

// Nguồn dữ liệu của màn nhắn tin: danh sách hội thoại (hai tab Tất cả / Tin chờ),
// hội thoại đang mở, tin nhắn, gửi tin (tin tạm → đã gửi/lỗi) và realtime theo
// kênh riêng của người dùng. Mọi lời gọi máy chủ đi qua ./api.

const CHAT_PATH = '/chat';

export const chatUrl = (chatId: number) => `${CHAT_PATH}/c/${chatId}`;

interface ConversationContextValue {
    currentUserId: number;
    conversationId: number;
    tab: ChatListTab;
    setTab: (tab: ChatListTab) => void;
    conversations: Conversation[];
    listMeta: ConversationListMeta;
    listLoading: boolean;
    endReached: boolean;
    loadMoreConversations: () => void;
    // Lọc danh sách đang có theo tên hoặc @username.
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedConversation: Conversation | null;
    messages: ConversationMessage[];
    allMessagesLoaded: boolean;
    messagesLoading: boolean;
    fetchPreviousMessages: () => Promise<number>;
    // Tin khung chat cần cuộn tới và tô nền (bấm vào khối trích dẫn).
    focusedMessageId: number | null;
    clearFocusedMessage: () => void;
    focusMessage: (messageId: number) => Promise<void>;
    uiSettings: UISettings;
    updateUISettings: (patch: UISettings) => void;
    isOnExpandedLayout: boolean;
    toggleConversationLayout: () => void;
    sendReply: (payload: { content: string; contentAttributes?: Record<string, unknown> }) => void;
    retryFailedMessage: (message: ConversationMessage) => Promise<void>;
    // Tin tạm gửi hỏng thì chỉ bỏ khỏi khung chat.
    deleteConversationMessage: (message: ConversationMessage) => Promise<void>;
    toggleTypingStatus: (typingStatus: 'on' | 'off') => void;
    markMessagesRead: (conversationId: number) => Promise<void>;
    openDirectChat: (userId: number) => Promise<void>;
    createGroup: (input: { title: string; userIds: number[]; avatar?: File | null }) => Promise<void>;
    // Nạp lại hội thoại (và thành viên nhóm) sau một thao tác quản lý nhóm.
    refreshConversation: (conversationId: number) => Promise<Conversation | null>;
    groupMembers: GroupMemberPerson[];
    acceptRequest: () => Promise<void>;
    removeConversation: (conversationId: number) => Promise<void>;
    setCounterpartBlocked: (blocked: boolean) => Promise<void>;
    reportConversation: (reason: AbuseReason, note?: string) => Promise<void>;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function useConversation(): ConversationContextValue {
    const context = useContext(ConversationContext);
    if (!context) {
        throw new Error('useConversation must be used within ConversationProvider');
    }
    return context;
}

// Bản không bắt buộc có provider: mảnh UI dùng chung (bong bóng tin) vẫn vẽ được ngoài trang nhắn tin.
export function useOptionalConversation(): ConversationContextValue | null {
    return useContext(ConversationContext);
}

const EMPTY_META: ConversationListMeta = { request_count: 0, has_more: false };

function newEchoId(): string {
    return window.crypto.randomUUID();
}

function matchesSearch(conversation: Conversation, query: string): boolean {
    const needle = query.trim().replace(/^@/, '').toLowerCase();
    if (!needle) return true;
    const sender = conversation.meta.sender;
    return [sender.name, sender.username, conversation.title].some(value => value?.toLowerCase().includes(needle));
}

export function ConversationProvider({ conversationId = 0, children }: { conversationId?: number; children: ReactNode }) {
    const { auth } = usePage<DashboardPageProps>().props;
    const currentUserId = auth.user?.id ?? 0;
    const viewportWidth = useViewportWidth();

    const [uiSettings, setUiSettings] = useState<UISettings>(() => auth.user?.ui_settings ?? {});
    const updateUISettings = useCallback((patch: UISettings) => {
        setUiSettings(current => persistUISettings(current, patch));
    }, []);
    const isOnExpandedLayout = computeExpandedLayout(uiSettings, viewportWidth);
    const toggleConversationLayout = useCallback(() => {
        updateUISettings({
            conversation_display_type:
                uiSettings.conversation_display_type === LAYOUT_TYPES.EXPANDED ? LAYOUT_TYPES.CONDENSED : LAYOUT_TYPES.EXPANDED,
        });
    }, [uiSettings.conversation_display_type, updateUISettings]);

    // ---- Danh sách ----
    const [tab, setTabState] = useState<ChatListTab>('all');
    const [allConversations, setAllConversations] = useState<Conversation[]>([]);
    const [listMeta, setListMeta] = useState<ConversationListMeta>(EMPTY_META);
    const [listLoading, setListLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const tabRef = useRef(tab);
    tabRef.current = tab;
    const allConversationsRef = useRef(allConversations);
    allConversationsRef.current = allConversations;

    const loadConversations = useCallback(
        async (targetTab: ChatListTab, before?: number) => {
            setListLoading(true);
            try {
                const response = await fetchChats(targetTab, before);
                if (tabRef.current !== targetTab) return;
                const loaded = response.payload.map(item => toViewerConversation(item, currentUserId));
                setAllConversations(current => (before ? [...current, ...loaded] : loaded));
                setListMeta(response.meta);
            } catch (error) {
                useAlert(parseApiErrorMessage(error) || t('PEOPLE.CHAT.LOAD_ERROR'));
            } finally {
                setListLoading(false);
            }
        },
        [currentUserId],
    );

    useEffect(() => {
        void loadConversations(tab);
    }, [tab, loadConversations]);

    const setTab = useCallback((nextTab: ChatListTab) => {
        setAllConversations([]);
        setTabState(nextTab);
    }, []);

    const loadMoreConversations = useCallback(() => {
        const last = allConversations[allConversations.length - 1];
        if (listLoading || !listMeta.has_more || !last) return;
        void loadConversations(tab, last.last_activity_at);
    }, [allConversations, listLoading, listMeta.has_more, loadConversations, tab]);

    const conversations = useMemo(
        () => allConversations.filter(item => matchesSearch(item, searchQuery)),
        [allConversations, searchQuery],
    );

    // ---- Hội thoại đang mở ----
    const [openedConversation, setOpenedConversation] = useState<Conversation | null>(null);
    const listedConversation = allConversations.find(item => item.id === conversationId) ?? null;
    const selectedConversation = conversationId ? (listedConversation ?? (openedConversation?.id === conversationId ? openedConversation : null)) : null;

    useEffect(() => {
        if (!conversationId) return;
        let cancelled = false;
        fetchChat(conversationId)
            .then(chat => {
                if (!cancelled) setOpenedConversation(toViewerConversation(chat, currentUserId));
            })
            .catch(() => {
                if (!cancelled) router.visit(CHAT_PATH);
            });
        return () => {
            cancelled = true;
        };
    }, [conversationId, currentUserId]);

    // ---- Tin nhắn ----
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);
    const [focusedMessageId, setFocusedMessageId] = useState<number | null>(null);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    const conversationIdRef = useRef(conversationId);
    conversationIdRef.current = conversationId;

    const viewerMessages = useCallback(
        (items: ConversationMessage[]) => items.map(item => toViewerMessage(item, currentUserId)),
        [currentUserId],
    );

    const markMessagesRead = useCallback(async (chatId: number) => {
        setAllConversations(current => current.map(item => (item.id === chatId ? { ...item, unread_count: 0 } : item)));
        try {
            await markChatRead(chatId);
        } catch {
            // Lần mở sau sẽ đánh dấu lại.
        }
    }, []);

    const loadLatestMessages = useCallback(
        async (chatId: number) => {
            setMessagesLoading(true);
            try {
                const response = await fetchMessages(chatId);
                if (conversationIdRef.current !== chatId) return;
                setMessages(current => withUnsentOf(viewerMessages(response.payload), current, chatId));
                setAllMessagesLoaded(!response.meta.has_more);
            } finally {
                setMessagesLoading(false);
            }
        },
        [viewerMessages],
    );

    useEffect(() => {
        setMessages(current => current.filter(item => isUnsentMessageId(item.id) && item.conversation_id === conversationId));
        setAllMessagesLoaded(false);
        setFocusedMessageId(null);
        if (conversationId) void loadLatestMessages(conversationId);
    }, [conversationId, loadLatestMessages]);

    // Đã xem chỉ gửi khi đã là cuộc trò chuyện chính thức: tin chờ từ người lạ thì
    // người gửi không biết mình đã đọc cho tới khi chấp nhận.
    const selectedMemberStatus = selectedConversation?.member_status;
    useEffect(() => {
        if (conversationId && selectedMemberStatus === 'active' && !messagesLoading) void markMessagesRead(conversationId);
    }, [conversationId, selectedMemberStatus, messagesLoading, markMessagesRead]);

    const fetchPreviousMessages = useCallback(async (): Promise<number> => {
        const oldest = messagesRef.current.find(item => !isUnsentMessageId(item.id));
        if (!conversationId || !oldest || allMessagesLoaded) return 0;
        const response = await fetchMessages(conversationId, oldest.id);
        setMessages(current => [...viewerMessages(response.payload), ...current]);
        setAllMessagesLoaded(!response.meta.has_more);
        return response.payload.length;
    }, [allMessagesLoaded, conversationId, viewerMessages]);

    const focusMessage = useCallback(
        async (messageId: number) => {
            for (let page = 0; page < 10 && !messagesRef.current.some(item => item.id === messageId); page += 1) {
                if ((await fetchPreviousMessages()) === 0) break;
            }
            setFocusedMessageId(messageId);
        },
        [fetchPreviousMessages],
    );

    const clearFocusedMessage = useCallback(() => setFocusedMessageId(null), []);

    // Mở từ liên kết tới một tin: nạp xong trang đầu thì cuộn tới tin đó.
    const linkedMessageIdRef = useRef(readFocusMessageId(window.location.search));
    useEffect(() => {
        const linkedMessageId = linkedMessageIdRef.current;
        if (!linkedMessageId || messagesLoading || !messages.length) return;
        linkedMessageIdRef.current = null;
        void focusMessage(linkedMessageId);
    }, [focusMessage, messages.length, messagesLoading]);

    // ---- Gửi tin ----
    const deliver = useCallback(
        async (chatId: number, pending: ConversationMessage) => {
            try {
                const saved = toViewerMessage(
                    await sendMessage(chatId, {
                        content: pending.content ?? '',
                        echoId: pending.echo_id!,
                        inReplyTo: (pending.content_attributes.in_reply_to as number | undefined) ?? null,
                        mentions: pending.content_attributes.mentions as OutgoingMention[] | undefined,
                    }),
                    currentUserId,
                );
                setMessages(current => (conversationIdRef.current === chatId ? applyIncomingMessage(current, saved).messages : current));
                setAllConversations(current =>
                    current.map(item => (item.id === chatId ? applyMessageToConversation(item, saved, { isOpen: true }) : item)),
                );
            } catch (error) {
                setMessages(current =>
                    markUnsentFailed(current, pending.echo_id!, parseApiErrorMessage(error) || t('CONVERSATION.MESSAGE_ERROR')),
                );
            }
        },
        [currentUserId],
    );

    const sendReply = useCallback(
        ({ content, contentAttributes = {} }: { content: string; contentAttributes?: Record<string, unknown> }) => {
            if (!conversationId || !content.trim()) return;
            const now = Math.floor(Date.now() / 1000);
            const pending: ConversationMessage = {
                id: -Date.now(),
                content,
                conversation_id: conversationId,
                message_type: MESSAGE_TYPES.OUTGOING,
                content_type: 'text',
                status: MESSAGE_STATUS.PROGRESS,
                content_attributes: contentAttributes,
                created_at: now,
                platform_sent_at: now,
                private: false,
                source_id: null,
                sender_type: 'User',
                sender_id: currentUserId,
                echo_id: newEchoId(),
                attachments: [],
            };
            setMessages(current => [...current, pending]);
            void deliver(conversationId, pending);
        },
        [conversationId, currentUserId, deliver],
    );

    const retryFailedMessage = useCallback(
        async (message: ConversationMessage) => {
            if (!message.echo_id || !isUnsentMessageId(message.id)) return;
            setMessages(current => markUnsentSending(current, message.echo_id!));
            await deliver(message.conversation_id, message);
        },
        [deliver],
    );

    const deleteConversationMessage = useCallback(async (message: ConversationMessage) => {
        if (message.echo_id && isUnsentMessageId(message.id)) {
            setMessages(current => removeUnsent(current, message.echo_id!));
        }
    }, []);

    const toggleTypingStatus = useCallback(
        (typingStatus: 'on' | 'off') => {
            if (conversationId) void toggleTyping(conversationId, typingStatus === 'on').catch(() => undefined);
        },
        [conversationId],
    );

    // ---- Hành động trên hội thoại ----
    const [groupRevision, setGroupRevision] = useState(0);
    const isGroupOpen = selectedConversation?.kind === 'group';
    const { members: groupMembers } = useGroupMembers(conversationId, isGroupOpen, groupRevision);

    const refreshConversation = useCallback(
        async (chatId: number): Promise<Conversation | null> => {
            if (chatId === conversationIdRef.current) setGroupRevision(revision => revision + 1);
            let chat: Conversation;
            try {
                chat = toViewerConversation(await fetchChat(chatId), currentUserId);
            } catch {
                setAllConversations(current => current.filter(item => item.id !== chatId));
                if (conversationIdRef.current === chatId) router.visit(CHAT_PATH);
                return null;
            }
            const belongsToTab = (chat.member_status === 'pending') === (tabRef.current === 'requests');
            setAllConversations(current =>
                belongsToTab ? upsertConversation(current, chat) : current.filter(item => item.id !== chatId),
            );
            setOpenedConversation(current => (current?.id === chatId ? chat : current));
            return chat;
        },
        [currentUserId],
    );

    const openDirectChat = useCallback(async (userId: number) => {
        try {
            const chat = await openDirectChatRequest(userId);
            router.visit(chatUrl(chat.id));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('PEOPLE.CHAT.OPEN_ERROR'));
        }
    }, []);

    const createGroup = useCallback(async (input: { title: string; userIds: number[]; avatar?: File | null }) => {
        try {
            const chat = toViewerConversation(await createGroupRequest(input), currentUserId);
            setAllConversations(current => (tabRef.current === 'all' ? upsertConversation(current, chat) : current));
            router.visit(chatUrl(chat.id));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('CONVERSATION.MESSAGE_ERROR'));
            throw error;
        }
    }, [currentUserId]);

    const acceptRequest = useCallback(async () => {
        if (!conversationId) return;
        await acceptChat(conversationId);
        setAllConversations(current => current.filter(item => item.id !== conversationId));
        setListMeta(current => ({ ...current, request_count: Math.max(0, current.request_count - 1) }));
        await refreshConversation(conversationId);
    }, [conversationId, refreshConversation]);

    const removeConversation = useCallback(async (chatId: number) => {
        await removeChat(chatId);
        setAllConversations(current => current.filter(item => item.id !== chatId));
        if (conversationIdRef.current === chatId) router.visit(CHAT_PATH);
    }, []);

    const setCounterpartBlocked = useCallback(
        async (blocked: boolean) => {
            const counterpartId = selectedConversation?.meta.sender.id;
            if (!conversationId || !counterpartId) return;
            await (blocked ? blockUser(counterpartId) : unblockUser(counterpartId));
            await refreshConversation(conversationId);
            useAlert(t(blocked ? 'CHAT.BLOCK.BLOCKED' : 'CHAT.BLOCK.UNBLOCKED'));
        },
        [conversationId, refreshConversation, selectedConversation?.meta.sender.id],
    );

    const reportConversation = useCallback(
        async (reason: AbuseReason, note?: string) => {
            if (!selectedConversation) return;
            const target =
                selectedConversation.kind === 'group'
                    ? { type: 'chat' as const, id: selectedConversation.id }
                    : { type: 'user' as const, id: selectedConversation.meta.sender.id };
            if (!target.id) return;
            await reportAbuse({ ...target, reason, note });
            useAlert(t('CHAT.REPORT.SENT'));
        },
        [selectedConversation],
    );

    // ---- Realtime ----
    useRealtimeEvent<{ chat_id: number; message: ConversationMessage }>('chat.message.created', ({ chat_id: chatId, message }) => {
        const viewerMessage = toViewerMessage(message, currentUserId);
        const isOpen = conversationIdRef.current === chatId;
        if (isOpen) {
            setMessages(current => applyIncomingMessage(current, viewerMessage).messages);
            const isActiveChat = allConversationsRef.current.find(item => item.id === chatId)?.member_status === 'active';
            if (isActiveChat && viewerMessage.message_type === MESSAGE_TYPES.INCOMING && document.visibilityState === 'visible') {
                void markMessagesRead(chatId);
            }
        }
        const listed = allConversationsRef.current.some(item => item.id === chatId);
        if (listed) {
            setAllConversations(current =>
                sortConversations(
                    current.map(item => (item.id === chatId ? applyMessageToConversation(item, viewerMessage, { isOpen }) : item)),
                ),
            );
        } else {
            void refreshConversation(chatId).then(chat => {
                if (chat?.member_status === 'pending' && tabRef.current !== 'requests') {
                    setListMeta(current => ({ ...current, request_count: current.request_count + 1 }));
                }
            });
        }
    });

    useRealtimeEvent<{ chat_id: number; user_id: number; message_id: number }>('chat.read', ({ chat_id: chatId, user_id: userId, message_id: messageId }) => {
        if (userId === currentUserId || conversationIdRef.current !== chatId) return;
        setMessages(current => applyReadReceipt(current, messageId));
    });

    useRealtimeEvent<{ chat_id: number; removed?: boolean }>('chat.updated', ({ chat_id: chatId, removed }) => {
        if (removed) {
            setAllConversations(current => current.filter(item => item.id !== chatId));
            if (conversationIdRef.current === chatId) router.visit(CHAT_PATH);
            return;
        }
        void refreshConversation(chatId);
    });

    // Mất kết nối lâu thì nạp lại danh sách và khung tin đang mở.
    useEffect(
        () =>
            registerReconnectHandlers({
                fetchConversationsOnReconnect: () => loadConversations(tabRef.current),
                fetchConversationMessagesOnReconnect: async () => {
                    if (conversationIdRef.current) await loadLatestMessages(conversationIdRef.current);
                },
            }),
        [loadConversations, loadLatestMessages],
    );

    const value = useMemo<ConversationContextValue>(
        () => ({
            currentUserId,
            conversationId,
            tab,
            setTab,
            conversations,
            listMeta,
            listLoading,
            endReached: !listMeta.has_more,
            loadMoreConversations,
            searchQuery,
            setSearchQuery,
            selectedConversation,
            messages,
            allMessagesLoaded,
            messagesLoading,
            fetchPreviousMessages,
            focusedMessageId,
            clearFocusedMessage,
            focusMessage,
            uiSettings,
            updateUISettings,
            isOnExpandedLayout,
            toggleConversationLayout,
            sendReply,
            retryFailedMessage,
            deleteConversationMessage,
            toggleTypingStatus,
            markMessagesRead,
            openDirectChat,
            createGroup,
            refreshConversation,
            groupMembers,
            acceptRequest,
            removeConversation,
            setCounterpartBlocked,
            reportConversation,
        }),
        [
            currentUserId,
            conversationId,
            tab,
            setTab,
            conversations,
            listMeta,
            listLoading,
            loadMoreConversations,
            searchQuery,
            selectedConversation,
            messages,
            allMessagesLoaded,
            messagesLoading,
            fetchPreviousMessages,
            focusedMessageId,
            clearFocusedMessage,
            focusMessage,
            uiSettings,
            updateUISettings,
            isOnExpandedLayout,
            toggleConversationLayout,
            sendReply,
            retryFailedMessage,
            deleteConversationMessage,
            toggleTypingStatus,
            markMessagesRead,
            openDirectChat,
            createGroup,
            refreshConversation,
            groupMembers,
            acceptRequest,
            removeConversation,
            setCounterpartBlocked,
            reportConversation,
        ],
    );

    return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}
