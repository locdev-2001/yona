import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import { debounce } from '@chatwoot/utils';

import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { readReactions } from 'dashboard/components-next/message/helpers/reactions';
import type { ConversationFilterCondition } from 'dashboard/components-next/filter/helper/filterHelper';
import { buildConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';
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
    assignAgent as assignAgentRequest,
    assignTeam as assignTeamRequest,
    fetchConversation,
    fetchConversationAttachments,
    fetchConversationMeta,
    fetchConversations,
    fetchFilteredConversations,
    fetchMessages,
    markMessagesRead as markMessagesReadRequest,
    markMessagesUnread as markMessagesUnreadRequest,
    muteConversation as muteConversationRequest,
    sendMessage,
    retryMessage,
    addMessageReaction,
    removeMessageReaction,
    deleteMessage,
    updateConversationCustomAttributes as updateCustomAttributesRequest,
    togglePriority as togglePriorityRequest,
    toggleStatus as toggleStatusRequest,
    toggleTyping,
    unmuteConversation as unmuteConversationRequest,
} from './api';
import {
    applyConversationMuted,
    applyConversationPriority,
    applyConversationStatus,
    snoozedUntilForStatus,
} from './lifecycleReducers';
import { applyUnreadCount, getMetaDebounceKey, MARK_READ_COMMIT_DELAY } from './unreadHelpers';
import type { MetaDebounceKey } from './unreadHelpers';
import {
    appendMessageAttachments,
    applyConversationAdded,
    applyConversationContact,
    applyConversationLastActivity,
    applyConversationUpdate,
    applyIncomingMessage,
    applyMessageToConversation,
    findPendingMessageIndex,
    mergeFetchedConversations,
    selectVisibleConversations,
    shouldAddConversationToList,
    sortComparator,
} from './realtimeReducers';
import {
    ASSIGNEE_TAB_VALUES,
    ASSIGNEE_TYPE,
    CONVERSATION_TYPE,
    CONVERSATIONS_PER_PAGE,
    LAYOUT_TYPES,
    MESSAGE_STATUS,
    MESSAGE_TYPES,
    SORT_BY_TYPE,
    STATUS_TYPE,
} from './constants';
import type { ConversationType } from './constants';
import type {
    AgentMeta,
    AssigneeTab,
    Conversation,
    ConversationListMeta,
    ConversationMessage,
    ConversationPriority,
    ConversationStatus,
    ConversationStatusFilter,
    TeamMeta,
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
    label: string;
    conversationType: ConversationType;
    conversationId: number;
    conversations: Conversation[];
    listMeta: ConversationListMeta;
    listLoading: boolean;
    endReached: boolean;
    assigneeTab: AssigneeTab;
    status: ConversationStatusFilter;
    sortBy: string;
    appliedFilters: ConversationFilterCondition[] | null;
    selectedConversation: Conversation | null;
    messages: ConversationMessage[];
    allMessagesLoaded: boolean;
    messagesLoading: boolean;
    // attachments/getSelectedChatAttachments của store gốc — accordion Attachments.
    attachments: MessageAttachment[];
    attachmentsLoaded: boolean;
    uiSettings: UISettings;
    updateUISettings: (patch: UISettings) => void;
    isOnExpandedLayout: boolean;
    toggleConversationLayout: () => void;
    setAssigneeTab: (tab: AssigneeTab) => void;
    setStatusFilter: (status: ConversationStatusFilter) => void;
    setSortFilter: (sortBy: string) => void;
    applyConversationFilters: (filters: ConversationFilterCondition[]) => void;
    clearConversationFilters: () => void;
    loadMoreConversations: () => void;
    fetchPreviousMessages: () => Promise<number>;
    sendReply: (payload: {
        content: string;
        isPrivate: boolean;
        cc_emails?: string;
        bcc_emails?: string;
        to_emails?: string;
    }) => void;
    retryFailedMessage: (message: ConversationMessage) => Promise<void>;
    toggleMessageReaction: (message: ConversationMessage, emoji: string) => Promise<void>;
    deleteConversationMessage: (message: ConversationMessage) => Promise<void>;
    toggleTypingStatus: (typingStatus: 'on' | 'off', isPrivate: boolean) => void;
    toggleStatus: (payload: ToggleStatusPayload) => Promise<void>;
    togglePriority: (priority: ConversationPriority | null) => Promise<void>;
    assignAgent: (agent: AgentMeta | null, assigneeType?: string | null) => Promise<void>;
    assignTeam: (team: TeamMeta | null) => Promise<void>;
    muteConversation: () => Promise<void>;
    unmuteConversation: () => Promise<void>;
    markMessagesRead: (conversationId: number) => Promise<void>;
    markMessagesUnread: (conversationId: number) => Promise<void>;
    // updateCustomAttributes của store gốc — accordion Conversation Information.
    updateConversationCustomAttributes: (customAttributes: Record<string, unknown>) => Promise<void>;
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

// Mutation ASSIGN_AGENT/ASSIGN_TEAM của store/modules/conversations/index.js.
function applyConversationAssignee(
    conversations: Conversation[],
    conversationId: number,
    assignee: AgentMeta | null,
    assigneeType?: string | null,
): Conversation[] {
    const inferredAssigneeType = assignee ? 'User' : null;
    return conversations.map((item) =>
        item.id === conversationId
            ? {
                  ...item,
                  meta: {
                      ...item.meta,
                      assignee: assignee ?? undefined,
                      assignee_type: (assigneeType === undefined ? inferredAssigneeType : assigneeType) ?? undefined,
                  },
              }
            : item,
    );
}

function applyConversationTeam(
    conversations: Conversation[],
    conversationId: number,
    team: TeamMeta | null,
): Conversation[] {
    return conversations.map((item) =>
        item.id === conversationId ? { ...item, meta: { ...item.meta, team: team ?? undefined } } : item,
    );
}

function matchesSingleStatusFilter(
    filters: ConversationFilterCondition[] | null,
    status: ConversationStatus,
): boolean | null {
    if (filters?.length !== 1 || filters[0].attributeKey !== 'status') return null;
    if (!['equal_to', 'not_equal_to'].includes(filters[0].filterOperator)) return null;

    const values = filterPrimitiveValues(filters[0]);
    const included = values.includes('all') || values.includes(status);

    return filters[0].filterOperator === 'equal_to' ? included : !included;
}

function filterPrimitiveValues(filter: ConversationFilterCondition): string[] {
    const rawValues = Array.isArray(filter.values) ? filter.values : [filter.values];

    return rawValues.map(value =>
        value && typeof value === 'object' && !Array.isArray(value) && 'id' in value
            ? String(value.id)
            : String(value),
    );
}

function matchesLoadedConversation(
    conversation: Conversation,
    filters: ConversationFilterCondition[],
): boolean | null {
    if (filters.length !== 1) return null;
    const [filter] = filters;
    const values = filterPrimitiveValues(filter);

    if (filter.attributeKey === 'status' && ['equal_to', 'not_equal_to'].includes(filter.filterOperator)) {
        const included = values.includes('all') || values.includes(conversation.status);
        return filter.filterOperator === 'equal_to' ? included : !included;
    }

    if (filter.attributeKey === 'labels') {
        const hasAnyLabel = conversation.labels.some(label => values.includes(label));
        if (filter.filterOperator === 'equal_to') return hasAnyLabel;
        if (filter.filterOperator === 'not_equal_to') return !hasAnyLabel;
        if (filter.filterOperator === 'is_present') return conversation.labels.length > 0;
        if (filter.filterOperator === 'is_not_present') return conversation.labels.length === 0;
    }

    return null;
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
    teamId?: number;
    label?: string;
    conversationType?: ConversationType;
    // Trung tâm thông báo dùng lại toàn bộ phần hội thoại nhưng không có cột
    // ChatList — tắt hẳn truy vấn danh sách như InboxView.vue của bản gốc.
    withConversationList?: boolean;
    children: ReactNode;
}

let pendingEchoCounter = 0;

export function ConversationProvider({
    conversationId = 0,
    inboxId = 0,
    teamId = 0,
    label = '',
    conversationType = '',
    withConversationList = true,
    children,
}: ProviderProps) {
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

    // Bộ lọc cơ bản của danh sách hội thoại nằm chung một khoá `ui_settings`.
    // Yona thêm `assignee_type` vào cụm này (xem reports/ux-deviations.md #1).
    const filterSettings = (user.ui_settings?.conversations_filter_by ?? {}) as {
        status?: string;
        order_by?: string;
        assignee_type?: string;
    };

    // Lệch có chủ đích: mặc định là "Tất cả", không phải "Của tôi" như Chatwoot —
    // chủ shop một người mở inbox lần đầu phải thấy khách đang chờ, không phải một
    // cột trống. Người dùng đổi tab thì lựa chọn được nhớ lại.
    const [assigneeTab, setAssigneeTabState] = useState<AssigneeTab>(
        ASSIGNEE_TAB_VALUES.includes(filterSettings.assignee_type as AssigneeTab)
            ? (filterSettings.assignee_type as AssigneeTab)
            : ASSIGNEE_TYPE.ALL,
    );
    const [status, setStatus] = useState<ConversationStatusFilter>(
        (filterSettings.status as ConversationStatusFilter) || STATUS_TYPE.OPEN,
    );
    const [sortBy, setSortBy] = useState<string>(
        Object.values(SORT_BY_TYPE).includes(filterSettings.order_by as never)
            ? (filterSettings.order_by as string)
            : SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC,
    );
    const [appliedFilters, setAppliedFilters] = useState<ConversationFilterCondition[] | null>(null);
    const appliedFiltersRef = useRef<ConversationFilterCondition[] | null>(null);
    appliedFiltersRef.current = appliedFilters;
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);

    const [allConversations, setAllConversations] = useState<Conversation[]>([]);
    const allConversationsRef = useRef<Conversation[]>([]);
    allConversationsRef.current = allConversations;
    const statusRequestVersionsRef = useRef(new Map<number, number>());
    const statusRequestQueuesRef = useRef(new Map<number, Promise<void>>());
    const [listMeta, setListMeta] = useState<ConversationListMeta>(EMPTY_META);
    const [listLoading, setListLoading] = useState(true);
    const [endReached, setEndReached] = useState(false);
    const pageRef = useRef(0);
    const listRequestVersionRef = useRef(0);
    const fetchPageRef = useRef<(page: number, append: boolean) => Promise<void>>(async () => undefined);
    const conversationIdRef = useRef(conversationId);
    conversationIdRef.current = conversationId;

    // BUS_EVENTS.SCROLL_TO_MESSAGE của gốc kéo theo makeMessagesRead — phát khi mở
    // hội thoại, khi có tin nối vào hội thoại đang mở và khi hội thoại đang mở được
    // cập nhật. Ref để các handler khai báo phía trên gọi được hàm định nghĩa sau.
    const markMessagesReadRef = useRef<(targetId: number) => void>(() => undefined);
    // Bản mới nhất của `messages` cho các handler không nằm trong vòng render.
    const messagesRef = useRef<ConversationMessage[]>([]);

    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    messagesRef.current = messages;
    const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    // fetchAllAttachments của MessagesView.vue: nạp theo hội thoại đang mở, không
    // theo accordion — mở panel là đã có sẵn dữ liệu như bản gốc.
    const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
    const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
    // SET_LAST_MESSAGE_ID_IN_SYNC_CONVERSATION: mốc tin cuối lúc mất kết nối.
    const lastMessageIdBeforeDisconnectRef = useRef<number | null>(null);

    // conversationFilters.labels của ChatList.vue: URL /label/{title} = một nhãn.
    const labelFilters = useMemo(() => (label ? [label] : []), [label]);
    const viewFilters = useMemo(
        () => ({ assigneeTab, status, inboxId, teamId, currentUserId, labels: labelFilters }),
        [assigneeTab, status, inboxId, teamId, currentUserId, labelFilters],
    );
    const conversations = useMemo(() => {
        if (appliedFilters) {
            return [...filteredConversations]
                .sort((a, b) => sortComparator(a, b, SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC));
        }

        return selectVisibleConversations(allConversations, viewFilters, sortBy);
    }, [allConversations, appliedFilters, filteredConversations, viewFilters, sortBy]);
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
            labels: labelFilters.length ? labelFilters : undefined,
            conversationType: conversationType || undefined,
        }),
        [accountId, assigneeTab, status, sortBy, inboxId, teamId, labelFilters, conversationType],
    );

    const fetchPage = useCallback(
        async (page: number, append: boolean) => {
            if (!withConversationList) {
                setListLoading(false);
                return;
            }
            // Callback cũ (basic hoặc bộ filter trước) có thể còn nằm trong
            // debounce/realtime queue. Không cho nó giành request version của
            // view đang hiển thị.
            if (appliedFilters !== appliedFiltersRef.current) return;
            const requestVersion = listRequestVersionRef.current + 1;
            listRequestVersionRef.current = requestVersion;
            setListLoading(true);
            try {
                // Người dùng thường Snooze rồi lọc ngay. Chờ các mutation status
                // đang bay hoàn tất để truy vấn filter không đọc trạng thái DB cũ.
                if (appliedFilters && statusRequestQueuesRef.current.size > 0) {
                    await Promise.allSettled([...statusRequestQueuesRef.current.values()]);
                }
                const response = appliedFilters
                    ? await fetchFilteredConversations(
                          accountId,
                          buildConversationFilterPayload(appliedFilters),
                          page,
                      )
                    : await fetchConversations({ ...listQuery, page });
                if (
                    listRequestVersionRef.current !== requestVersion
                    || appliedFilters !== appliedFiltersRef.current
                ) return;
                const payload = response.data.payload;
                setListMeta(response.data.meta);
                setFilteredConversations(previous => {
                    if (!appliedFilters) return [];
                    const kept = append ? previous : [];
                    const known = new Set(kept.map(conversation => conversation.id));

                    return [...kept, ...payload.filter(conversation => !known.has(conversation.id))];
                });
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
                if (listRequestVersionRef.current !== requestVersion) return;
                useAlert(t('CHAT_LIST.FETCH_ERROR'));
            } finally {
                if (listRequestVersionRef.current === requestVersion) {
                    setListLoading(false);
                }
            }
        },
        [accountId, appliedFilters, listQuery, withConversationList],
    );
    fetchPageRef.current = fetchPage;

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

    // Một điểm ghi duy nhất cho cả cụm `conversations_filter_by`: server merge NÔNG
    // (array_merge ở ProfilesController) nên mỗi lần lưu phải gửi đủ ba khoá, nếu
    // không khoá không gửi sẽ bị xoá mất.
    const persistConversationFilters = useCallback(
        (patch: { status?: string; order_by?: string; assignee_type?: AssigneeTab }) => {
            updateUISettings({
                conversations_filter_by: {
                    status,
                    order_by: sortBy,
                    assignee_type: assigneeTab,
                    ...patch,
                },
            });
        },
        [assigneeTab, sortBy, status, updateUISettings],
    );

    const setAssigneeTab = useCallback(
        (tab: AssigneeTab) => {
            setAssigneeTabState(tab);
            persistConversationFilters({ assignee_type: tab });
        },
        [persistConversationFilters],
    );

    const setStatusFilter = useCallback(
        (value: ConversationStatusFilter) => {
            setStatus(value);
            persistConversationFilters({ status: value });
        },
        [persistConversationFilters],
    );

    const setSortFilter = useCallback(
        (value: string) => {
            setSortBy(value);
            persistConversationFilters({ order_by: value });
        },
        [persistConversationFilters],
    );

    const applyConversationFilters = useCallback((filters: ConversationFilterCondition[]) => {
        const nextFilters = filters.map(filter => ({ ...filter }));
        setFilteredConversations(
            allConversationsRef.current.filter(conversation => matchesLoadedConversation(conversation, nextFilters) === true),
        );
        setAppliedFilters(nextFilters);
    }, []);

    const clearConversationFilters = useCallback(() => {
        setAppliedFilters(null);
        setFilteredConversations([]);
    }, []);

    const refreshAppliedFilters = useCallback(() => {
        if (appliedFiltersRef.current) void fetchPageRef.current(1, false);
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
                // setActiveChat gốc phát SCROLL_TO_MESSAGE sau khi nạp xong tin →
                // onScrollToMessage cuộn + makeMessagesRead.
                markMessagesReadRef.current(conversationId);
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

    // fetchAllAttachments: lỗi vẫn commit danh sách rỗng để accordion thoát spinner.
    useEffect(() => {
        let cancelled = false;
        setAttachments([]);
        setAttachmentsLoaded(false);
        if (!conversationId) return undefined;

        fetchConversationAttachments(accountId, conversationId)
            .catch(() => [] as MessageAttachment[])
            .then((payload) => {
                if (cancelled) return;
                setAttachments(payload);
                setAttachmentsLoaded(true);
            });

        return () => {
            cancelled = true;
        };
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
            // ADD_CONVERSATION_ATTACHMENTS: bản gốc góp tệp từ tin đến (realtime) và
            // từ phản hồi của lần gửi; ở yona tin mình gửi cũng quay lại qua realtime
            // nên chỉ cần một chỗ này.
            setAttachments((current) => appendMessageAttachments(current, plainMessage));
            // ADD_MESSAGE gốc chỉ phát SCROLL_TO_MESSAGE (→ makeMessagesRead) khi tin
            // thật sự nối vào cuối hội thoại đang mở, không phải khi thay tin pending.
            const appended = findPendingMessageIndex(messagesRef.current, plainMessage) === -1;
            setMessages((current) => applyIncomingMessage(current, plainMessage).messages);
            if (appended) markMessagesReadRef.current(plainMessage.conversation_id);
        }
        setAllConversations((current) =>
            current.map((item) =>
                item.id === plainMessage.conversation_id
                    ? applyMessageToConversation(item, plainMessage, embedded?.unread_count ?? item.unread_count)
                    : item,
            ),
        );
        setFilteredConversations((current) =>
            current.map((item) =>
                item.id === plainMessage.conversation_id
                    ? applyMessageToConversation(item, plainMessage, embedded?.unread_count ?? item.unread_count)
                    : item,
            ),
        );
    }, []);

    const conversationTypeRef = useRef<ConversationType>(conversationType);
    conversationTypeRef.current = conversationType;

    const updateConversation = useCallback((conversation: Conversation) => {
        if (!conversation?.id) return;
        setAllConversations((current) =>
            applyConversationUpdate(current, conversation, conversationTypeRef.current),
        );
        // Advanced filter là danh sách server-authoritative: realtime chỉ cập
        // nhật card đã có, không tự chèn record chưa được endpoint filter duyệt.
        setFilteredConversations((current) =>
            current.some(item => item.id === conversation.id)
                ? applyConversationUpdate(current, conversation, conversationTypeRef.current)
                : current,
        );
        refreshAppliedFilters();
        // UPDATE_CONVERSATION gốc phát SCROLL_TO_MESSAGE khi bản ghi đổi là hội thoại đang mở.
        if (conversation.id === conversationIdRef.current) {
            markMessagesReadRef.current(conversation.id);
        }
    }, [refreshAppliedFilters]);

    // conversationStats/get của ChatList.vue khi nhận 'fetch_conversation_stats':
    // 3 nhịp debounce chọn theo all_count (account càng lớn hỏi càng thưa).
    const listQueryRef = useRef(listQuery);
    listQueryRef.current = listQuery;
    const allCountRef = useRef(listMeta.all_count);
    allCountRef.current = listMeta.all_count;

    const fetchMetaData = useCallback(() => {
        // Debouncer chỉ được tạo một lần; đọc ref để không gọi meta của basic
        // view bằng closure cũ rồi ghi đè count của advanced filter.
        if (appliedFiltersRef.current) return;
        fetchConversationMeta(listQueryRef.current).then(
            (response) => setListMeta(response.meta),
            () => undefined,
        );
    }, []);

    const metaDebouncersRef = useRef<Record<MetaDebounceKey, () => void> | null>(null);
    if (!metaDebouncersRef.current) {
        metaDebouncersRef.current = {
            default: debounce(fetchMetaData, 1000, false, 5000),
            long: debounce(fetchMetaData, 7500, false, 20000),
            superLong: debounce(fetchMetaData, 15000, false, 30000),
        };
    }

    const refetchListMeta = useCallback(() => {
        metaDebouncersRef.current![getMetaDebounceKey(allCountRef.current)]();
    }, []);

    // markMessagesRead / markMessagesUnread (messageReadActions.js): đọc thì 4s sau
    // mới hạ unread_count, đánh dấu chưa đọc thì ghi ngay theo payload server.
    const markReadTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
    const cancelPendingReadCommit = useCallback((targetId: number) => {
        const timer = markReadTimersRef.current.get(targetId);
        if (timer) {
            clearTimeout(timer);
            markReadTimersRef.current.delete(targetId);
        }
    }, []);
    useEffect(() => {
        const timers = markReadTimersRef.current;
        return () => timers.forEach((timer) => clearTimeout(timer));
    }, []);

    const markMessagesRead = useCallback(
        async (targetId: number) => {
            if (!targetId) return;
            try {
                await markMessagesReadRequest(accountId, targetId);
                // Backend trả 204 (khác gốc trả conversation) → mốc seen = lúc gọi,
                // đúng bằng `DateTime.now.utc` mà server vừa ghi.
                const lastSeen = Math.floor(Date.now() / 1000);
                cancelPendingReadCommit(targetId);
                markReadTimersRef.current.set(
                    targetId,
                    setTimeout(() => {
                        markReadTimersRef.current.delete(targetId);
                        setAllConversations((current) => applyUnreadCount(current, targetId, lastSeen));
                    }, MARK_READ_COMMIT_DELAY),
                );
            } catch {
                // Gốc nuốt lỗi (markMessagesRead không báo gì cho người dùng).
            }
        },
        [accountId, cancelPendingReadCommit],
    );

    const markMessagesUnread = useCallback(
        async (targetId: number) => {
            if (!targetId) return;
            await markMessagesUnreadRequest(accountId, targetId);
            // Vừa mở hội thoại rồi đánh dấu chưa đọc: hủy lần hạ unread còn đang chờ.
            cancelPendingReadCommit(targetId);
            // 204 rỗng nên mốc seen + unread_count mới phải đọc lại từ server
            // (gốc lấy thẳng trong body của `unread`).
            const conversation = await fetchConversation(accountId, targetId);
            setAllConversations((current) =>
                applyUnreadCount(
                    current,
                    targetId,
                    conversation.agent_last_seen_at,
                    conversation.unread_count,
                ),
            );
        },
        [accountId, cancelPendingReadCommit],
    );

    markMessagesReadRef.current = markMessagesRead;

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
        if (shouldAddConversationToList(conversation, inboxId, conversationType)) {
            setAllConversations((current) => applyConversationAdded(current, conversation));
        }
    });
    // action addMentions: chỉ màn Mentions mới nghe, và chỉ cập nhật thẻ đã có.
    useRealtimeEvent<Conversation>('conversation.mentioned', (conversation) => {
        if (conversationType === CONVERSATION_TYPE.MENTION) updateConversation(conversation);
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
        ({
            content,
            isPrivate,
            cc_emails: ccEmails,
            bcc_emails: bccEmails,
            to_emails: toEmails,
        }: {
            content: string;
            isPrivate: boolean;
            cc_emails?: string;
            bcc_emails?: string;
            to_emails?: string;
        }) => {
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
                ...(ccEmails !== undefined ? { cc_emails: ccEmails } : {}),
                ...(bccEmails !== undefined ? { bcc_emails: bccEmails } : {}),
                ...(toEmails !== undefined ? { to_emails: toEmails } : {}),
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

    // Gửi lại tin thất bại. Tin quay về qua chính đường ADD_MESSAGE nên trạng
    // thái/lý do lỗi cập nhật một chỗ như tin gửi mới.
    const retryFailedMessage = useCallback(
        async (message: ConversationMessage) => {
            if (!conversationId || !message.id) return;
            try {
                addMessage(await retryMessage(accountId, conversationId, message.id));
            } catch (error: unknown) {
                const body = (error as { body?: { error?: string } }).body;
                useAlert(body?.error || t('CONVERSATION.MESSAGE_FAILURE.RETRY_FAILED'));
            }
        },
        [accountId, conversationId, addMessage],
    );

    // Thả/gỡ biểu cảm: bấm lại chính emoji phía tenant đã thả là gỡ (lô 4: một
    // người giữ đúng một emoji). Tin trả về đã mang `content_attributes.reactions` mới.
    const toggleMessageReaction = useCallback(
        async (message: ConversationMessage, emoji: string) => {
            if (!conversationId || !message.id) return;
            const alreadyReacted = readReactions(message.content_attributes ?? {}).some(
                reaction => reaction.emoji === emoji && reaction.by.startsWith('agent'),
            );
            try {
                addMessage(
                    alreadyReacted
                        ? await removeMessageReaction(accountId, conversationId, message.id)
                        : await addMessageReaction(accountId, conversationId, message.id, emoji),
                );
            } catch (error: unknown) {
                const body = (error as { body?: { error?: string } }).body;
                useAlert(body?.error || t('CONVERSATION.MESSAGE_ERROR'));
            }
        },
        [accountId, conversationId, addMessage],
    );

    // Thu hồi ở kênh (khi kênh khai `outbound_recall`) hoặc xoá một chiều ở Yona
    // — cùng MỘT endpoint, lõi quyết theo năng lực kênh.
    const deleteConversationMessage = useCallback(
        async (message: ConversationMessage) => {
            if (!conversationId || !message.id) return;
            try {
                addMessage(await deleteMessage(accountId, conversationId, message.id));
            } catch (error: unknown) {
                const body = (error as { body?: { error?: string } }).body;
                useAlert(body?.error || t('CONVERSATION.MESSAGE_ERROR'));
            }
        },
        [accountId, conversationId, addMessage],
    );

    // Đổi status ngay trên UI để thao tác Resolve/Snooze không bị chặn bởi round-trip
    // API/worker. Request chạy nền sau khi hàm trả về; response server vẫn ghi đè
    // optimistic state, lỗi thì rollback snapshot.
    const toggleStatus = useCallback(
        ({ status, snoozedUntil = null, conversationId: targetId }: ToggleStatusPayload) => {
            const targetConversationId = targetId || conversationId;
            if (!targetConversationId) return Promise.resolve();

            const previous = allConversationsRef.current.find(item => item.id === targetConversationId);
            const optimisticSnoozedUntil = snoozedUntilForStatus(status, snoozedUntil);
            const refreshFilterOnSettle = appliedFiltersRef.current !== null;
            const requestVersion = (statusRequestVersionsRef.current.get(targetConversationId) ?? 0) + 1;
            statusRequestVersionsRef.current.set(targetConversationId, requestVersion);
            setAllConversations(current =>
                applyConversationStatus(current, targetConversationId, status, optimisticSnoozedUntil),
            );
            setFilteredConversations(current =>
                matchesSingleStatusFilter(appliedFiltersRef.current, status) === false
                    ? current.filter(item => item.id !== targetConversationId)
                    : applyConversationStatus(current, targetConversationId, status, optimisticSnoozedUntil),
            );
            if (previous && matchesSingleStatusFilter(appliedFiltersRef.current, status) === false) {
                const wasMine = previous.meta?.assignee?.id === currentUserId;
                const wasUnassigned = !previous.meta?.assignee;
                setListMeta(current => ({
                    mine_count: Math.max(0, current.mine_count - (wasMine ? 1 : 0)),
                    assigned_count: Math.max(0, current.assigned_count - (wasUnassigned ? 0 : 1)),
                    unassigned_count: Math.max(0, current.unassigned_count - (wasUnassigned ? 1 : 0)),
                    all_count: Math.max(0, current.all_count - 1),
                }));
            }

            // Giữ thứ tự ghi khi người dùng bấm tiếp trước khi request trước hoàn
            // tất. UI đã đổi ngay ở trên, còn request sau chỉ rời browser sau khi
            // request trước settle để persistence không quay ngược sau F5.
            const previousRequest = statusRequestQueuesRef.current.get(targetConversationId) ?? Promise.resolve();
            const currentRequest = previousRequest
                .catch(() => undefined)
                .then(() => toggleStatusRequest(accountId, targetConversationId, status, snoozedUntil))
                .then(
                    ({ payload }) => {
                        if (statusRequestVersionsRef.current.get(targetConversationId) !== requestVersion) return;

                        setAllConversations(current =>
                            applyConversationStatus(
                                current,
                                targetConversationId,
                                payload.current_status,
                                payload.snoozed_until,
                            ),
                        );
                        setFilteredConversations(current =>
                            applyConversationStatus(
                                current,
                                targetConversationId,
                                payload.current_status,
                                payload.snoozed_until,
                            ),
                        );
                    },
                    () => {
                        if (statusRequestVersionsRef.current.get(targetConversationId) !== requestVersion) return;

                        if (previous) {
                            setAllConversations(current =>
                                applyConversationStatus(
                                    current,
                                    targetConversationId,
                                    previous.status,
                                    previous.snoozed_until,
                                ),
                            );
                            setFilteredConversations(current =>
                                applyConversationStatus(
                                    current,
                                    targetConversationId,
                                    previous.status,
                                    previous.snoozed_until,
                                ),
                            );
                        }
                    },
                );

            statusRequestQueuesRef.current.set(targetConversationId, currentRequest);
            void currentRequest.finally(() => {
                if (statusRequestQueuesRef.current.get(targetConversationId) === currentRequest) {
                    statusRequestQueuesRef.current.delete(targetConversationId);
                }
                if (refreshFilterOnSettle) {
                    void fetchPageRef.current(1, false);
                }
            });

            return currentRequest;
        },
        [accountId, conversationId, currentUserId],
    );

    // ConversationAction.vue: setCurrentChatPriority lạc quan rồi assignPriority; lỗi → trả lại giá trị cũ.
    const togglePriority = useCallback(
        async (priority: ConversationPriority | null) => {
            if (!conversationId) return;
            const previousPriority = selectedConversation?.priority ?? null;
            setAllConversations(current => applyConversationPriority(current, conversationId, priority));
            try {
                await togglePriorityRequest(accountId, conversationId, priority);
                refreshAppliedFilters();
            } catch (error) {
                setAllConversations(current => applyConversationPriority(current, conversationId, previousPriority));
                throw error;
            }
        },
        [accountId, conversationId, refreshAppliedFilters, selectedConversation?.priority],
    );

    const updateConversationCustomAttributes = useCallback(
        async (customAttributes: Record<string, unknown>) => {
            if (!conversationId) return;
            updateConversation(await updateCustomAttributesRequest(accountId, conversationId, customAttributes));
        },
        [accountId, conversationId, updateConversation],
    );

    // assignAgent gốc: setCurrentChatAssignee lạc quan (ConversationAction.vue) rồi POST,
    // xong ghi đè bằng payload server. Lỗi → trả lại assignee cũ rồi throw (panel toast).
    const assignAgent = useCallback(
        async (agent: AgentMeta | null, assigneeType: string | null = null) => {
            if (!conversationId) return;
            const previousAssignee = selectedConversation?.meta?.assignee ?? null;
            const previousAssigneeType = selectedConversation?.meta?.assignee_type ?? null;
            setAllConversations(current =>
                applyConversationAssignee(current, conversationId, agent, assigneeType),
            );
            try {
                const assignee = await assignAgentRequest(accountId, conversationId, agent?.id ?? null, assigneeType);
                setAllConversations(current =>
                    applyConversationAssignee(current, conversationId, assignee, assigneeType),
                );
                refreshAppliedFilters();
            } catch (error) {
                setAllConversations(current =>
                    applyConversationAssignee(current, conversationId, previousAssignee, previousAssigneeType),
                );
                throw error;
            }
        },
        [
            accountId,
            conversationId,
            refreshAppliedFilters,
            selectedConversation?.meta?.assignee,
            selectedConversation?.meta?.assignee_type,
        ],
    );

    // assignTeam gốc: gỡ team = gửi team_id 0.
    const assignTeam = useCallback(
        async (team: TeamMeta | null) => {
            if (!conversationId) return;
            const previousTeam = selectedConversation?.meta?.team ?? null;
            setAllConversations(current => applyConversationTeam(current, conversationId, team));
            try {
                const assignedTeam = await assignTeamRequest(accountId, conversationId, team?.id ?? 0);
                setAllConversations(current => applyConversationTeam(current, conversationId, assignedTeam));
                refreshAppliedFilters();
            } catch (error) {
                setAllConversations(current => applyConversationTeam(current, conversationId, previousTeam));
                throw error;
            }
        },
        [accountId, conversationId, refreshAppliedFilters, selectedConversation?.meta?.team],
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
            label,
            conversationType,
            conversationId,
            conversations,
            listMeta,
            listLoading,
            endReached,
            assigneeTab,
            status,
            sortBy,
            appliedFilters,
            selectedConversation,
            messages,
            allMessagesLoaded,
            messagesLoading,
            attachments,
            attachmentsLoaded,
            uiSettings,
            updateUISettings,
            isOnExpandedLayout,
            toggleConversationLayout,
            setAssigneeTab,
            setStatusFilter,
            setSortFilter,
            applyConversationFilters,
            clearConversationFilters,
            loadMoreConversations,
            fetchPreviousMessages,
            sendReply,
            retryFailedMessage,
            toggleMessageReaction,
            deleteConversationMessage,
            toggleTypingStatus,
            toggleStatus,
            togglePriority,
            assignAgent,
            assignTeam,
            muteConversation,
            unmuteConversation,
            markMessagesRead,
            markMessagesUnread,
            updateConversationCustomAttributes,
        }),
        [
            accountId,
            currentUserId,
            inboxId,
            teamId,
            label,
            conversationType,
            conversationId,
            conversations,
            listMeta,
            listLoading,
            endReached,
            assigneeTab,
            status,
            sortBy,
            appliedFilters,
            selectedConversation,
            messages,
            allMessagesLoaded,
            messagesLoading,
            attachments,
            attachmentsLoaded,
            uiSettings,
            updateUISettings,
            isOnExpandedLayout,
            toggleConversationLayout,
            setAssigneeTab,
            setStatusFilter,
            setSortFilter,
            applyConversationFilters,
            clearConversationFilters,
            loadMoreConversations,
            fetchPreviousMessages,
            sendReply,
            retryFailedMessage,
            toggleMessageReaction,
            deleteConversationMessage,
            toggleTypingStatus,
            toggleStatus,
            togglePriority,
            assignAgent,
            assignTeam,
            muteConversation,
            unmuteConversation,
            markMessagesRead,
            markMessagesUnread,
            updateConversationCustomAttributes,
        ],
    );

    return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}
