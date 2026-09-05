import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { useAlert } from 'dashboard/composables/useAlert';
import { updateUISettings as persistUISettings } from 'dashboard/composables/useUISettings';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import {
    DISCONNECT_DELAY_THRESHOLD,
    getSecondsSinceDisconnect,
    registerReconnectHandlers,
} from 'dashboard/realtime/ReconnectService';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import {
    fetchConversation,
    fetchConversationMeta,
    fetchConversations,
    fetchMessages,
    muteConversation as muteConversationRequest,
    sendMessage,
    togglePriority as togglePriorityRequest,
    toggleStatus as toggleStatusRequest,
    toggleTyping,
    unmuteConversation as unmuteConversationRequest,
} from './api';
import { applyConversationMuted, applyConversationPriority, applyConversationStatus } from './lifecycleReducers';
import {
    applyConversationAdded,
    applyConversationContact,
    applyConversationLastActivity,
    applyConversationUpdate,
    applyIncomingMessage,
    applyMessageToConversation,
    mergeFetchedConversations,
    selectVisibleConversations,
    shouldAddConversationToList,
} from './realtimeReducers';
import {
    ASSIGNEE_TYPE,
    CONVERSATIONS_PER_PAGE,
    LAYOUT_TYPES,
    MESSAGE_STATUS,
    MESSAGE_TYPES,
    SORT_BY_TYPE,
    STATUS_TYPE,
} from './constants';
import type {
    AssigneeTab,
    Conversation,
    ConversationListMeta,
    ConversationMessage,
    ConversationPriority,
    ConversationStatus,
    ConversationStatusFilter,
} from './types';

// Thay cụm store vuex conversations/conversationPage của Chatwoot:
// list + counts + selected chat + messages + gửi tin (pending → sent/failed)
// + realtime (actionCable.js → useRealtimeEvent) + reconnect (ReconnectService).
// `allConversations` = state.allConversations gốc; `conversations` = getter đã
// lọc theo tab/status/inbox/team + sort — nên update realtime tự đưa vào/ra list.

interface ConversationContextValue {
    accountId: number;
    currentUserId: number;
    inboxId: number;
    teamId: number;
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
    uiSettings: UISettings;
    updateUISettings: (patch: UISettings) => void;
    isOnExpandedLayout: boolean;
    toggleConversationLayout: () => void;
    setAssigneeTab: (tab: AssigneeTab) => void;
    setStatusFilter: (status: ConversationStatusFilter) => void;
    setSortFilter: (sortBy: string) => void;
    loadMoreConversations: () => void;
    fetchPreviousMessages: () => Promise<number>;
    sendReply: (payload: { content: string; isPrivate: boolean }) => void;
    toggleTypingStatus: (typingStatus: 'on' | 'off', isPrivate: boolean) => void;
    toggleStatus: (payload: ToggleStatusPayload) => Promise<void>;
    togglePriority: (priority: ConversationPriority | null) => Promise<void>;
    muteConversation: () => Promise<void>;
    unmuteConversation: () => Promise<void>;
}

export interface ToggleStatusPayload {
    status: ConversationStatus;
    snoozedUntil?: number | null;
    // Gốc cho phép đổi status của conversation trong context menu (không phải conversation đang mở).
    conversationId?: number;
}

// Payload message.created/updated: message phẳng + conversation rút gọn (push_event_data).
type MessageEventPayload = ConversationMessage & {
    conversation?: { assignee_id?: number | null; unread_count?: number; last_activity_at?: number };
};

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
    teamId?: number;
    children: ReactNode;
}

let pendingEchoCounter = 0;

export function ConversationProvider({ conversationId = 0, inboxId = 0, teamId = 0, children }: ProviderProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const user = auth.user!;
    const currentUserId = user.id;

    // ui_settings dùng chung cả trang (store uiSettings gốc): layout, chữ ký, hotkey…
    const [uiSettings, setUiSettings] = useState<UISettings>(user.ui_settings ?? {});
    const updateUISettings = useCallback((patch: UISettings) => {
        setUiSettings((current) => persistUISettings(current, patch));
    }, []);

    // isOnExpandedLayout + toggleConversationLayout của ConversationView.vue/ChatListHeader.vue.
    const isOnExpandedLayout =
        ((uiSettings.conversation_display_type as string | undefined) ?? LAYOUT_TYPES.CONDENSED) !== LAYOUT_TYPES.CONDENSED;
    const toggleConversationLayout = useCallback(() => {
        const newViewType = isOnExpandedLayout ? LAYOUT_TYPES.CONDENSED : LAYOUT_TYPES.EXPANDED;
        updateUISettings({
            conversation_display_type: newViewType,
            previously_used_conversation_display_type: newViewType,
        });
    }, [isOnExpandedLayout, updateUISettings]);

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

    const [allConversations, setAllConversations] = useState<Conversation[]>([]);
    const [listMeta, setListMeta] = useState<ConversationListMeta>(EMPTY_META);
    const [listLoading, setListLoading] = useState(true);
    const [endReached, setEndReached] = useState(false);
    const pageRef = useRef(0);
    const conversationIdRef = useRef(conversationId);
    conversationIdRef.current = conversationId;

    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    // SET_LAST_MESSAGE_ID_IN_SYNC_CONVERSATION: mốc tin cuối lúc mất kết nối.
    const lastMessageIdBeforeDisconnectRef = useRef<number | null>(null);

    const viewFilters = useMemo(
        () => ({ assigneeTab, status, inboxId, teamId, currentUserId }),
        [assigneeTab, status, inboxId, teamId, currentUserId],
    );
    const conversations = useMemo(
        () => selectVisibleConversations(allConversations, viewFilters, sortBy),
        [allConversations, viewFilters, sortBy],
    );
    const selectedConversation = useMemo(
        () => allConversations.find((item) => item.id === conversationId) ?? null,
        [allConversations, conversationId],
    );

    const listQuery = useMemo(
        () => ({
            accountId,
            assigneeType: assigneeTab,
            status,
            sortBy,
            inboxId: inboxId || undefined,
            teamId: teamId || undefined,
        }),
        [accountId, assigneeTab, status, sortBy, inboxId, teamId],
    );

    const fetchPage = useCallback(
        async (page: number, append: boolean) => {
            setListLoading(true);
            try {
                const response = await fetchConversations({ ...listQuery, page });
                const payload = response.data.payload;
                setListMeta(response.data.meta);
                setAllConversations((previous) => {
                    // Nạp lại trang 1 vẫn giữ conversation đang mở (getter gốc chỉ ẩn nó khỏi list).
                    const kept = append
                        ? previous
                        : previous.filter((c) => c.id === conversationIdRef.current);
                    const known = new Set(kept.map((c) => c.id));
                    return [...kept, ...payload.filter((c) => !known.has(c.id))];
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
        [listQuery],
    );

    // Đổi filter/tab/inbox/team → nạp lại từ trang 1 (resetAndFetchData của bản gốc).
    useEffect(() => {
        setAllConversations((previous) => previous.filter((c) => c.id === conversationIdRef.current));
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

    // Chọn conversation theo display_id trên URL: chưa có trong allConversations
    // thì fetch rồi đưa vào (getConversation gốc commit UPDATE_CONVERSATION).
    useEffect(() => {
        let cancelled = false;

        if (!conversationId) {
            setMessages([]);
            setAllMessagesLoaded(false);
            return undefined;
        }

        if (!allConversations.some((c) => c.id === conversationId)) {
            fetchConversation(accountId, conversationId).then((conversation) => {
                if (cancelled) return;
                setAllConversations((current) => applyConversationUpdate(current, conversation));
            }, () => undefined);
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
        // allConversations cố tình không nằm trong deps: chỉ nạp lại khi đổi conversation.
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

    // ADD_MESSAGE: thay tin pending/trùng id, không thì nối; card trong list nhận
    // timestamp + unread_count (từ conversation nhúng, không có thì giữ nguyên).
    const addMessage = useCallback((message: MessageEventPayload) => {
        const { conversation: embedded, ...plainMessage } = message;
        if (plainMessage.conversation_id === conversationIdRef.current) {
            setMessages((current) => applyIncomingMessage(current, plainMessage).messages);
        }
        setAllConversations((current) =>
            current.map((item) =>
                item.id === plainMessage.conversation_id
                    ? applyMessageToConversation(item, plainMessage, embedded?.unread_count ?? item.unread_count)
                    : item,
            ),
        );
    }, []);

    const updateConversation = useCallback((conversation: Conversation) => {
        if (!conversation?.id) return;
        setAllConversations((current) => applyConversationUpdate(current, conversation));
    }, []);

    // conversationStats/get của ChatList.vue khi nhận 'fetch_conversation_stats'.
    const refetchListMeta = useCallback(() => {
        fetchConversationMeta(listQuery).then((response) => setListMeta(response.meta), () => undefined);
    }, [listQuery]);

    // actionCable.js → store: các event conversation/message của Chatwoot.
    useRealtimeEvent<MessageEventPayload>('message.created', (message) => {
        addMessage(message);
        const lastActivityAt = message.conversation?.last_activity_at;
        if (lastActivityAt) {
            setAllConversations((current) =>
                applyConversationLastActivity(current, message.conversation_id, lastActivityAt),
            );
        }
    });
    useRealtimeEvent<MessageEventPayload>('message.updated', addMessage);
    // Counts: ActionCableConnector emit 'fetch_conversation_stats' sau các event
    // created/status_changed/assignee.changed/updated/contact.deleted như gốc.
    useRealtimeEvent<Conversation>('conversation.created', (conversation) => {
        if (shouldAddConversationToList(conversation, inboxId)) {
            setAllConversations((current) => applyConversationAdded(current, conversation));
        }
    });
    useRealtimeEvent<Conversation>('conversation.status_changed', updateConversation);
    useRealtimeEvent<Conversation>('conversation.updated', updateConversation);
    useRealtimeEvent<Conversation>('assignee.changed', updateConversation);
    useRealtimeEvent<Conversation>('conversation.read', updateConversation);
    useRealtimeEvent<Conversation>('conversation.contact_changed', (conversation) => {
        const sender = conversation?.meta?.sender;
        if (conversation?.id && sender) {
            setAllConversations((current) => applyConversationContact(current, conversation.id, sender));
        }
    });
    useRealtimeEvent('fetch_conversation_stats', refetchListMeta);

    // ReconnectService gốc: lưu mốc tin cuối lúc rớt; khi nối lại kéo list
    // updated_within + tin sau mốc rồi trộn (SET_ALL_CONVERSATION / SET_MISSING_MESSAGES).
    const reconnectHandlersRef = useRef({
        setConversationLastMessageId: () => undefined as void,
        fetchConversationsOnReconnect: async () => undefined as void,
        fetchConversationMessagesOnReconnect: async () => undefined as void,
    });
    reconnectHandlersRef.current = {
        setConversationLastMessageId: () => {
            const lastSynced = [...messages].reverse().find((item) => item.id > 0);
            lastMessageIdBeforeDisconnectRef.current = conversationId && lastSynced ? lastSynced.id : null;
        },
        fetchConversationsOnReconnect: async () => {
            const response = await fetchConversations({
                ...listQuery,
                page: 1,
                updatedWithin: getSecondsSinceDisconnect() + DISCONNECT_DELAY_THRESHOLD,
            });
            setListMeta(response.data.meta);
            setAllConversations((current) =>
                mergeFetchedConversations(current, response.data.payload, conversationIdRef.current),
            );
        },
        fetchConversationMessagesOnReconnect: async () => {
            const after = lastMessageIdBeforeDisconnectRef.current;
            if (!conversationId || !after) return;
            const response = await fetchMessages(accountId, conversationId, undefined, after);
            setMessages((current) => {
                const known = new Set(current.map((item) => item.id));
                const missing = response.payload.filter((item) => !known.has(item.id));
                return [...current, ...missing].sort((a, b) => a.created_at - b.created_at);
            });
            lastMessageIdBeforeDisconnectRef.current = null;
        },
    };
    useEffect(
        () =>
            registerReconnectHandlers({
                setConversationLastMessageId: () => reconnectHandlersRef.current.setConversationLastMessageId(),
                fetchConversationsOnReconnect: () => reconnectHandlersRef.current.fetchConversationsOnReconnect(),
                fetchConversationMessagesOnReconnect: () =>
                    reconnectHandlersRef.current.fetchConversationMessagesOnReconnect(),
            }),
        [],
    );

    // conversationTypingStatus/toggleTyping: nuốt lỗi như gốc.
    const toggleTypingStatus = useCallback(
        (typingStatus: 'on' | 'off', isPrivate: boolean) => {
            if (!conversationId) return;
            toggleTyping(accountId, conversationId, typingStatus, isPrivate).catch(() => undefined);
        },
        [accountId, conversationId],
    );

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
                    addMessage(message);
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
        [accountId, conversationId, selectedConversation, currentUserId, user, addMessage],
    );

    // toggleStatus gốc: gọi API rồi ghi current_status + snoozed_until từ payload lên
    // conversation (CHANGE_CONVERSATION_STATUS); lỗi nuốt như store gốc.
    const toggleStatus = useCallback(
        async ({ status, snoozedUntil = null, conversationId: targetId }: ToggleStatusPayload) => {
            const targetConversationId = targetId || conversationId;
            if (!targetConversationId) return;
            try {
                const { payload } = await toggleStatusRequest(accountId, targetConversationId, status, snoozedUntil);
                setAllConversations(current =>
                    applyConversationStatus(current, targetConversationId, payload.current_status, payload.snoozed_until),
                );
            } catch {
                // Gốc nuốt lỗi; realtime status_changed (nếu có) vẫn đồng bộ lại.
            }
        },
        [accountId, conversationId],
    );

    // ConversationAction.vue: setCurrentChatPriority lạc quan rồi assignPriority; lỗi → trả lại giá trị cũ.
    const togglePriority = useCallback(
        async (priority: ConversationPriority | null) => {
            if (!conversationId) return;
            const previousPriority = selectedConversation?.priority ?? null;
            setAllConversations(current => applyConversationPriority(current, conversationId, priority));
            try {
                await togglePriorityRequest(accountId, conversationId, priority);
            } catch (error) {
                setAllConversations(current => applyConversationPriority(current, conversationId, previousPriority));
                throw error;
            }
        },
        [accountId, conversationId, selectedConversation?.priority],
    );

    const setMuted = useCallback(
        async (muted: boolean) => {
            if (!conversationId) return;
            try {
                await (muted ? muteConversationRequest : unmuteConversationRequest)(accountId, conversationId);
                setAllConversations(current => applyConversationMuted(current, conversationId, muted));
            } catch {
                // muteConversation/unmuteConversation gốc nuốt lỗi.
            }
        },
        [accountId, conversationId],
    );
    const muteConversation = useCallback(() => setMuted(true), [setMuted]);
    const unmuteConversation = useCallback(() => setMuted(false), [setMuted]);

    const value = useMemo<ConversationContextValue>(
        () => ({
            accountId,
            currentUserId,
            inboxId,
            teamId,
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
            uiSettings,
            updateUISettings,
            isOnExpandedLayout,
            toggleConversationLayout,
            setAssigneeTab,
            setStatusFilter,
            setSortFilter,
            loadMoreConversations,
            fetchPreviousMessages,
            sendReply,
            toggleTypingStatus,
            toggleStatus,
            togglePriority,
            muteConversation,
            unmuteConversation,
        }),
        [
            accountId,
            currentUserId,
            inboxId,
            teamId,
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
            uiSettings,
            updateUISettings,
            isOnExpandedLayout,
            toggleConversationLayout,
            setAssigneeTab,
            setStatusFilter,
            setSortFilter,
            loadMoreConversations,
            fetchPreviousMessages,
            sendReply,
            toggleTypingStatus,
            toggleStatus,
            togglePriority,
            muteConversation,
            unmuteConversation,
        ],
    );

    return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}
