import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { fetchConversation, fetchConversations, fetchMessages, sendMessage } from './api';
import { ASSIGNEE_TYPE, CONVERSATIONS_PER_PAGE, MESSAGE_STATUS, MESSAGE_TYPES, SORT_BY_TYPE, STATUS_TYPE } from './constants';
import type { AssigneeTab, Conversation, ConversationListMeta, ConversationMessage, ConversationStatusFilter } from './types';

// Thay cụm store vuex conversations/conversationPage của Chatwoot cho phạm vi B3:
// list + counts + selected chat + messages + gửi tin (pending → sent/failed).
// Realtime (B4) sẽ cắm thêm vào đây qua Echo.

interface ConversationContextValue {
    accountId: number;
    currentUserId: number;
    inboxId: number;
    conversationId: number;
    conversations: Conversation[];
    listMeta: ConversationListMeta;
    listLoading: boolean;
    endReached: boolean;
    assigneeTab: AssigneeTab;
    status: ConversationStatusFilter;
    sortBy: string;
    selectedConversation: Conversation | null;
    messages: ConversationMessage[];
    allMessagesLoaded: boolean;
    messagesLoading: boolean;
    setAssigneeTab: (tab: AssigneeTab) => void;
    setStatusFilter: (status: ConversationStatusFilter) => void;
    setSortFilter: (sortBy: string) => void;
    loadMoreConversations: () => void;
    fetchPreviousMessages: () => Promise<number>;
    sendReply: (payload: { content: string; isPrivate: boolean }) => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function useConversation(): ConversationContextValue {
    const context = useContext(ConversationContext);
    if (!context) {
        throw new Error('useConversation must be used within ConversationProvider');
    }
    return context;
}

const EMPTY_META: ConversationListMeta = {
    mine_count: 0,
    assigned_count: 0,
    unassigned_count: 0,
    all_count: 0,
};

interface ProviderProps {
    conversationId?: number;
    inboxId?: number;
    children: ReactNode;
}

let pendingEchoCounter = 0;

export function ConversationProvider({ conversationId = 0, inboxId = 0, children }: ProviderProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const user = auth.user!;
    const currentUserId = user.id;

    const filterSettings = (user.ui_settings?.conversations_filter_by ?? {}) as {
        status?: string;
        order_by?: string;
    };

    const [assigneeTab, setAssigneeTabState] = useState<AssigneeTab>(ASSIGNEE_TYPE.ME);
    const [status, setStatus] = useState<ConversationStatusFilter>(
        (filterSettings.status as ConversationStatusFilter) || STATUS_TYPE.OPEN,
    );
    const [sortBy, setSortBy] = useState<string>(
        Object.values(SORT_BY_TYPE).includes(filterSettings.order_by as never)
            ? (filterSettings.order_by as string)
            : SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC,
    );

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [listMeta, setListMeta] = useState<ConversationListMeta>(EMPTY_META);
    const [listLoading, setListLoading] = useState(true);
    const [endReached, setEndReached] = useState(false);
    const pageRef = useRef(0);

    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);

    const fetchPage = useCallback(
        async (page: number, append: boolean) => {
            setListLoading(true);
            try {
                const response = await fetchConversations({
                    accountId,
                    assigneeType: assigneeTab,
                    status,
                    page,
                    sortBy,
                    inboxId: inboxId || undefined,
                });
                const payload = response.data.payload;
                setListMeta(response.data.meta);
                setConversations((previous) => {
                    if (!append) return payload;
                    const known = new Set(previous.map((c) => c.id));
                    return [...previous, ...payload.filter((c) => !known.has(c.id))];
                });
                pageRef.current = page;
                if (payload.length < CONVERSATIONS_PER_PAGE) {
                    setEndReached(true);
                }
            } catch {
                useAlert(t('CHAT_LIST.FETCH_ERROR'));
            } finally {
                setListLoading(false);
            }
        },
        [accountId, assigneeTab, status, sortBy, inboxId],
    );

    // Đổi filter/tab/inbox → nạp lại từ trang 1 (resetAndFetchData của bản gốc).
    useEffect(() => {
        setConversations([]);
        setEndReached(false);
        pageRef.current = 0;
        void fetchPage(1, false);
    }, [fetchPage]);

    const loadMoreConversations = useCallback(() => {
        if (endReached || listLoading) return;
        void fetchPage(pageRef.current + 1, true);
    }, [endReached, listLoading, fetchPage]);

    const setAssigneeTab = useCallback((tab: AssigneeTab) => {
        setAssigneeTabState(tab);
    }, []);

    const setStatusFilter = useCallback((value: ConversationStatusFilter) => {
        setStatus(value);
    }, []);

    const setSortFilter = useCallback((value: string) => {
        setSortBy(value);
    }, []);

    // Chọn conversation theo display_id trên URL: lấy từ list nếu có, không thì fetch.
    useEffect(() => {
        let cancelled = false;

        if (!conversationId) {
            setSelectedConversation(null);
            setMessages([]);
            setAllMessagesLoaded(false);
            return undefined;
        }

        const known = conversations.find((c) => c.id === conversationId);

        const applyConversation = (conversation: Conversation) => {
            if (cancelled) return;
            setSelectedConversation(conversation);
        };

        if (known) {
            applyConversation(known);
        } else {
            fetchConversation(accountId, conversationId).then(applyConversation, () => undefined);
        }

        setMessages([]);
        setAllMessagesLoaded(false);
        setMessagesLoading(true);
        fetchMessages(accountId, conversationId).then(
            (response) => {
                if (cancelled) return;
                setMessages(response.payload);
                if (response.payload.length < 20) {
                    setAllMessagesLoaded(true);
                }
                setMessagesLoading(false);
            },
            () => {
                if (!cancelled) setMessagesLoading(false);
            },
        );

        return () => {
            cancelled = true;
        };
        // conversations cố tình không nằm trong deps: chỉ nạp lại khi đổi conversation.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, conversationId]);

    const fetchPreviousMessages = useCallback(async (): Promise<number> => {
        if (!conversationId || allMessagesLoaded || messages.length === 0) return 0;

        const before = messages[0].id;
        const response = await fetchMessages(accountId, conversationId, before);
        const previous = response.payload;
        if (previous.length < 20) {
            setAllMessagesLoaded(true);
        }
        setMessages((current) => {
            const known = new Set(current.map((m) => m.id));
            return [...previous.filter((m) => !known.has(m.id)), ...current];
        });
        return previous.length;
    }, [accountId, conversationId, allMessagesLoaded, messages]);

    // Cập nhật card trong list sau khi có tin mới (updateConversationById của store gốc).
    const touchConversationInList = useCallback((conversation: number, message: ConversationMessage) => {
        setConversations((current) =>
            current.map((item) =>
                item.id === conversation
                    ? {
                          ...item,
                          timestamp: message.created_at,
                          last_activity_at: message.created_at,
                          last_non_activity_message:
                              message.message_type === MESSAGE_TYPES.ACTIVITY ? item.last_non_activity_message : message,
                          messages: [message],
                      }
                    : item,
            ),
        );
    }, []);

    // createPendingMessageAndSend: chèn tin pending (status progress) rồi thay bằng
    // bản server trả về; lỗi → đánh dấu failed như bản gốc.
    const sendReply = useCallback(
        ({ content, isPrivate }: { content: string; isPrivate: boolean }) => {
            if (!conversationId || !selectedConversation) return;

            pendingEchoCounter += 1;
            const echoId = `${Date.now()}-${pendingEchoCounter}`;
            const pending: ConversationMessage = {
                id: -pendingEchoCounter,
                content,
                inbox_id: selectedConversation.inbox_id,
                conversation_id: conversationId,
                message_type: MESSAGE_TYPES.OUTGOING,
                content_type: 'text',
                status: MESSAGE_STATUS.PROGRESS,
                content_attributes: {},
                created_at: Math.floor(Date.now() / 1000),
                private: isPrivate,
                source_id: null,
                echo_id: echoId,
                sender: {
                    id: currentUserId,
                    name: user.name,
                    type: 'user',
                    thumbnail: user.avatar_url ?? '',
                },
            };
            setMessages((current) => [...current, pending]);

            sendMessage(accountId, conversationId, {
                content,
                private: isPrivate,
                echo_id: echoId,
            }).then(
                (message) => {
                    setMessages((current) => current.map((item) => (item.echo_id === echoId ? message : item)));
                    touchConversationInList(conversationId, message);
                },
                (error: unknown) => {
                    setMessages((current) =>
                        current.map((item) =>
                            item.echo_id === echoId ? { ...item, status: MESSAGE_STATUS.FAILED } : item,
                        ),
                    );
                    const body = (error as { body?: { error?: string } }).body;
                    useAlert(body?.error || t('CONVERSATION.MESSAGE_ERROR'));
                },
            );
        },
        [accountId, conversationId, selectedConversation, currentUserId, user, touchConversationInList],
    );

    const value = useMemo<ConversationContextValue>(
        () => ({
            accountId,
            currentUserId,
            inboxId,
            conversationId,
            conversations,
            listMeta,
            listLoading,
            endReached,
            assigneeTab,
            status,
            sortBy,
            selectedConversation,
            messages,
            allMessagesLoaded,
            messagesLoading,
            setAssigneeTab,
            setStatusFilter,
            setSortFilter,
            loadMoreConversations,
            fetchPreviousMessages,
            sendReply,
        }),
        [
            accountId,
            currentUserId,
            inboxId,
            conversationId,
            conversations,
            listMeta,
            listLoading,
            endReached,
            assigneeTab,
            status,
            sortBy,
            selectedConversation,
            messages,
            allMessagesLoaded,
            messagesLoading,
            setAssigneeTab,
            setStatusFilter,
            setSortFilter,
            loadMoreConversations,
            fetchPreviousMessages,
            sendReply,
        ],
    );

    return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}
