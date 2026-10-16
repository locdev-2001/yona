import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { compareBySentAt } from './messageTime';
import type { ReactNode } from 'react';
import { router, usePage } from '@inertiajs/react';
import { debounce } from '@ext/utils';

import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { readReactions } from 'dashboard/components-next/message/helpers/reactions';
import type { ConversationFilterCondition } from 'dashboard/components-next/filter/helper/filterHelper';
import { buildConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import { useAlert } from 'dashboard/composables/useAlert';
import { useViewportWidth } from 'dashboard/composables/useViewportWidth';
import { updateUISettings as persistUISettings } from 'dashboard/composables/useUISettings';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { scheduleUnreadCountRefresh, setViewedConversation } from 'dashboard/notifications/useUnreadCount';
import { markConversationSeen, nowInSeconds, unreadCountAfterSeen, type ConversationSeenPayload } from './conversationSeen';
import { useContactUpdatedEvent } from 'dashboard/realtime/contactUpdated';
import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import { BUS_EVENTS } from 'shared/helpers/emitter';
import {
    DISCONNECT_DELAY_THRESHOLD,
    getSecondsSinceDisconnect,
    registerReconnectHandlers,
} from 'dashboard/realtime/ReconnectService';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import { draftKey, setDraft as saveReplyDraft } from './draftApi';
import { createConversationFromDraft } from './compose/composeApi';
import { EMPTY_COMPOSE_DRAFT, draftBlocker } from './compose/composeDraft';
import type { ComposeDraft } from './compose/composeDraft';
import type { PendingAttachment } from 'dashboard/components/widgets/AttachmentsPreview';
import {
    assignAgent as assignAgentRequest,
    assignTeam as assignTeamRequest,
    fetchConversation,
    fetchConversationAttachments,
    fetchConversationMeta,
    fetchConversations,
    type ConversationListScope,
    tabCountsOf,
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
    markBankTransferPaid as markBankTransferPaidRequest,
    updateConversationCustomAttributes as updateCustomAttributesRequest,
    togglePriority as togglePriorityRequest,
    toggleStatus as toggleStatusRequest,
    toggleTyping,
    unmuteConversation as unmuteConversationRequest,
    setConversationPinned as setConversationPinnedRequest,
    reorderPinnedConversations as reorderPinnedConversationsRequest,
} from './api';
import type { SendMessagePayload } from './api';
import type { StickerItem } from './stickerApi';
import {
    isUnsentMessageId,
    markUnsentFailed,
    markUnsentSending,
    pendingAttachments,
    removeUnsent,
    splitFailedUnsent,
    withUnsentOf,
} from './pendingMessages';
import type { OutgoingAttachment } from './pendingMessages';
import {
    applyConversationMuted,
    applyConversationPinned,
    applyConversationPriority,
    applyPinPositions,
    applyPinState,
    pinPositionsForOrder,
    applyConversationStatus,
    snoozedUntilForStatus,
} from './lifecycleReducers';
import { hasExpandedLayoutPreference, isOnExpandedLayout as computeExpandedLayout } from './layoutMode';
import {
    loadFocusWindow,
    mergeMessagesChronologically,
    messagesRangeOf,
    readFocusMessageId,
    type FocusWindow,
} from './messageFocus';
import { readListSearchQuery, withListSearchQuery } from './chatlist/listSearch';
import { applyUnreadCount, getMetaDebounceKey } from './unreadHelpers';
import type { MetaDebounceKey } from './unreadHelpers';
import {
    appendMessageAttachments,
    applyContactUpdate,
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
    CONVERSATION_TYPE,
    CONVERSATIONS_PER_PAGE,
    LAYOUT_TYPES,
    MESSAGE_STATUS,
    MESSAGE_TYPES,
    SORT_BY_TYPE,
} from './constants';
import type { ConversationType } from './constants';
import type { ConversationListFilters } from './listFilters';
import { useConversationListFilters } from './useConversationListFilters';
import type {
    AgentMeta,
    AssigneeTab,
    ContactMeta,
    Conversation,
    ConversationListMeta,
    ConversationMessage,
    ConversationPriority,
    ConversationStatus,
    ConversationStatusFilter,
    TeamMeta,
} from './types';

// Store hội thoại + trang hội thoại của dashboard:
// list + counts + selected chat + messages + gửi tin (pending → sent/failed)
// + realtime (actionCable.js → useRealtimeEvent) + reconnect (ReconnectService).
// `allConversations` = state.allConversations gốc; `conversations` = getter đã
// lọc theo tab/status/inbox/team + sort — nên update realtime tự đưa vào/ra list.

interface ConversationContextValue {
    accountId: number;
    currentUserId: number;
    // Kênh, nhãn, trạng thái, sắp xếp — đọc/ghi qua useConversationListFilters.
    listFilters: ConversationListFilters;
    setListFilters: (patch: Partial<ConversationListFilters>) => void;
    teamId: number;
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
    // Phạm vi danh sách thường đang xem — ô tìm chia mục tìm trong đúng phạm vi này.
    listQuery: ConversationListScope;
    // Từ khoá ô tìm trong cột danh sách (đồng bộ với ?q= trên URL).
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedConversation: Conversation | null;
    messages: ConversationMessage[];
    allMessagesLoaded: boolean;
    messagesLoading: boolean;
    // Tin khung chat cần cuộn tới và tô nền (liên kết ?messageId= hoặc focusMessage).
    focusedMessageId: number | null;
    clearFocusedMessage: () => void;
    // Một đường cho mọi lối "nhảy tới tin": nạp đủ khoảng tới tin đó rồi cuộn tới.
    focusMessage: (messageId: number) => Promise<void>;
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
        // Dựng bằng buildOutgoingContentAttributes (trả lời trích dẫn…).
        contentAttributes?: Record<string, unknown>;
        attachments?: OutgoingAttachment[];
        // Tệp âm thanh trong `attachments` là bản ghi âm của ô soạn.
        isVoiceMessage?: boolean;
    }) => void;
    // Sticker đi một mình: không nội dung, không trích dẫn; máy chủ tự dựng tin từ mã.
    sendSticker: (sticker: StickerItem) => void;
    // Thẻ từ menu "Gửi thẻ": máy chủ kiểm payload, sai thì tin chuyển sang lỗi kèm lý do.
    sendStructured: (contentType: string, contentAttributes: Record<string, unknown>, content?: string) => void;
    // Tin tạm gửi hỏng (chưa tới máy chủ) thì gửi lại chính nội dung ở máy.
    retryFailedMessage: (message: ConversationMessage) => Promise<void>;
    toggleMessageReaction: (message: ConversationMessage, emoji: string) => Promise<void>;
    // Tin tạm gửi hỏng thì chỉ bỏ khỏi khung chat.
    deleteConversationMessage: (message: ConversationMessage) => Promise<void>;
    markBankTransferPaid: (message: ConversationMessage) => Promise<void>;
    toggleTypingStatus: (typingStatus: 'on' | 'off', isPrivate: boolean) => void;
    toggleStatus: (payload: ToggleStatusPayload) => Promise<void>;
    togglePriority: (priority: ConversationPriority | null) => Promise<void>;
    assignAgent: (agent: AgentMeta | null, assigneeType?: string | null) => Promise<void>;
    assignTeam: (team: TeamMeta | null) => Promise<void>;
    muteConversation: () => Promise<void>;
    unmuteConversation: () => Promise<void>;
    markMessagesRead: (conversationId: number, seenThrough?: number) => Promise<void>;
    markMessagesUnread: (conversationId: number) => Promise<void>;
    // Ghim của riêng người xem: cập nhật ngay trên danh sách, lỗi thì trả lại như cũ.
    setConversationPinned: (conversationId: number, pinned: boolean) => Promise<void>;
    // Xếp lại nhóm ghim đang hiện theo `orderedIds`; cập nhật ngay, lỗi thì trả về chỗ cũ.
    reorderPinnedConversations: (orderedIds: number[]) => Promise<void>;
    // updateCustomAttributes của store gốc — accordion Conversation Information.
    updateConversationCustomAttributes: (customAttributes: Record<string, unknown>) => Promise<void>;
    // Bản nháp hội thoại mới (route /inbox/new): chưa có hội thoại, lần gửi đầu
    // tiên tạo hội thoại rồi đi tiếp đường gửi chung.
    isComposing: boolean;
    composeContactId: number | null;
    composeDraft: ComposeDraft;
    updateComposeDraft: (patch: Partial<ComposeDraft> | ((draft: ComposeDraft) => Partial<ComposeDraft>)) => void;
    // Ô soạn của bản nháp khai cách đọc phần chưa gửi (chữ, tệp) để nó đi theo sang
    // hội thoại vừa tạo khi lần gửi đầu là sticker/thẻ. Trả về hàm huỷ khai báo.
    registerDraftComposer: (readComposer: () => DraftComposerContent) => () => void;
    // Tệp đang chờ mang từ bản nháp sang hội thoại vừa tạo; lấy một lần.
    takeCarriedAttachments: (conversationId: number) => PendingAttachment[];
}

export interface DraftComposerContent {
    // Rỗng khi ô soạn không có gì ngoài chữ ký.
    content: string;
    replyMode: string;
    attachments: PendingAttachment[];
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

// Bản không bắt buộc có provider — cho các mảnh UI (vd nút trong bong bóng tin)
// vẫn cần render được khi test đứng riêng, không dựng cả cây ConversationProvider.
export function useOptionalConversation(): ConversationContextValue | null {
    return useContext(ConversationContext);
}

const EMPTY_META: ConversationListMeta = {
    mine_count: 0,
    assigned_count: 0,
    unassigned_count: 0,
    all_count: 0,
};

interface ProviderProps {
    conversationId?: number;
    teamId?: number;
    conversationType?: ConversationType;
    // Trung tâm thông báo dùng lại toàn bộ phần hội thoại nhưng không có cột
    // ChatList — tắt hẳn truy vấn danh sách như InboxView.vue của bản gốc.
    withConversationList?: boolean;
    isComposing?: boolean;
    composeContactId?: number | null;
    children: ReactNode;
}

let pendingEchoCounter = 0;

export function ConversationProvider({
    conversationId = 0,
    teamId = 0,
    conversationType = '',
    withConversationList = true,
    isComposing = false,
    composeContactId = null,
    children,
}: ProviderProps) {
    const page = usePage<DashboardPageProps>();
    const { auth, currentAccount } = page.props;
    const accountId = currentAccount.id;
    const user = auth.user!;
    const currentUserId = user.id;

    // ui_settings dùng chung cả trang (store uiSettings gốc): layout, chữ ký, hotkey…
    const [uiSettings, setUiSettings] = useState<UISettings>(user.ui_settings ?? {});
    const updateUISettings = useCallback((patch: UISettings) => {
        setUiSettings((current) => persistUISettings(current, patch));
    }, []);

    // isOnExpandedLayout + toggleConversationLayout của ConversationView.vue/ChatListHeader.vue.
    // Ngưỡng màn hẹp cộng thêm ở layoutMode.ts (xem ghi chú lệch trong file đó).
    const viewportWidth = useViewportWidth();
    const isOnExpandedLayout = computeExpandedLayout(uiSettings, viewportWidth);
    const toggleConversationLayout = useCallback(() => {
        // Nút ⇥ chỉ hiện từ `md` trở lên nên luôn lật đúng lựa chọn đã lưu, không
        // bị ngưỡng màn hẹp làm lệch.
        const newViewType = hasExpandedLayoutPreference(uiSettings) ? LAYOUT_TYPES.CONDENSED : LAYOUT_TYPES.EXPANDED;
        updateUISettings({
            conversation_display_type: newViewType,
            previously_used_conversation_display_type: newViewType,
        });
    }, [uiSettings, updateUISettings]);

    const {
        filters: listFilters,
        assigneeTab,
        setFilters: setListFilters,
        setAssigneeTab,
    } = useConversationListFilters(updateUISettings);
    const { inboxIds, labels: labelFilters, status, sortBy } = listFilters;
    const [appliedFilters, setAppliedFilters] = useState<ConversationFilterCondition[] | null>(null);
    const appliedFiltersRef = useRef<ConversationFilterCondition[] | null>(null);
    appliedFiltersRef.current = appliedFilters;
    const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
    const [searchQuery, setSearchQueryState] = useState(() => readListSearchQuery(window.location.search));
    const setSearchQuery = useCallback((query: string) => setSearchQueryState(query.trim()), []);

    const [allConversations, setAllConversations] = useState<Conversation[]>([]);
    const allConversationsRef = useRef<Conversation[]>([]);
    allConversationsRef.current = allConversations;
    const statusRequestVersionsRef = useRef(new Map<number, number>());
    const statusRequestQueuesRef = useRef(new Map<number, Promise<void>>());
    const [listMeta, setListMeta] = useState<ConversationListMeta>(EMPTY_META);
    const [listLoading, setListLoading] = useState(true);
    const [endReached, setEndReached] = useState(false);
    const pageRef = useRef(0);
    // Con trỏ trang kế của danh sách thường; null thì cuộn tiếp bằng `page`
    // (bộ lọc nâng cao, sort theo biểu thức).
    const nextCursorRef = useRef<string | null>(null);
    const listRequestVersionRef = useRef(0);
    const fetchPageRef = useRef<(page: number, append: boolean) => Promise<void>>(async () => undefined);
    const conversationIdRef = useRef(conversationId);
    conversationIdRef.current = conversationId;

    // BUS_EVENTS.SCROLL_TO_MESSAGE của gốc kéo theo makeMessagesRead — phát khi mở
    // hội thoại, khi có tin nối vào hội thoại đang mở và khi hội thoại đang mở được
    // cập nhật. Ref để các handler khai báo phía trên gọi được hàm định nghĩa sau.
    const markMessagesReadRef = useRef<(targetId: number, seenThrough?: number) => void>(() => undefined);
    // Bản mới nhất của `messages` cho các handler không nằm trong vòng render.
    const messagesRef = useRef<ConversationMessage[]>([]);

    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    messagesRef.current = messages;
    // Nội dung của tin tạm chưa tới máy chủ, giữ để Gửi lại không cần soạn lại.
    const unsentPayloadsRef = useRef(new Map<string, SendMessagePayload>());
    const [allMessagesLoaded, setAllMessagesLoaded] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [focusedMessageId, setFocusedMessageId] = useState<number | null>(null);
    const clearFocusedMessage = useCallback(() => setFocusedMessageId(null), []);
    const requestedFocusId = readFocusMessageId(page.url ? new URL(page.url, window.location.origin).search : window.location.search);
    // fetchAllAttachments của MessagesView.vue: nạp theo hội thoại đang mở, không
    // theo accordion — mở panel là đã có sẵn dữ liệu như bản gốc.
    const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
    const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
    // SET_LAST_MESSAGE_ID_IN_SYNC_CONVERSATION: mốc tin cuối lúc mất kết nối.
    const lastMessageIdBeforeDisconnectRef = useRef<number | null>(null);

    const viewFilters = useMemo(
        () => ({ assigneeTab, status, inboxIds, teamId, currentUserId, labels: labelFilters }),
        [assigneeTab, status, inboxIds, teamId, currentUserId, labelFilters],
    );
    const conversations = useMemo(
        () =>
            appliedFilters
                ? [...filteredConversations].sort((a, b) => sortComparator(a, b, SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC))
                : selectVisibleConversations(allConversations, viewFilters, sortBy),
        [allConversations, appliedFilters, filteredConversations, viewFilters, sortBy],
    );
    const visibleConversationsRef = useRef(conversations);
    visibleConversationsRef.current = conversations;
    const selectedConversation = useMemo(
        () => allConversations.find((item) => item.id === conversationId) ?? null,
        [allConversations, conversationId],
    );

    const listQuery = useMemo<ConversationListScope>(
        () => ({
            accountId,
            assigneeType: assigneeTab,
            status,
            sortBy,
            // API danh sách nhận một inbox_id (MAX_INBOX_FILTERS).
            inboxId: inboxIds[0],
            teamId: teamId || undefined,
            labels: labelFilters.length ? labelFilters : undefined,
            conversationType: conversationType || undefined,
        }),
        [accountId, assigneeTab, status, sortBy, inboxIds, teamId, labelFilters, conversationType],
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
                const cursor = !appliedFilters && append ? nextCursorRef.current : null;
                const response = appliedFilters
                    ? await fetchFilteredConversations(accountId, buildConversationFilterPayload(appliedFilters), page)
                    : await fetchConversations({ ...listQuery, ...(cursor ? { cursor } : { page }) });
                if (
                    listRequestVersionRef.current !== requestVersion
                    || appliedFilters !== appliedFiltersRef.current
                ) return;
                const payload = response.data.payload;
                const tabCounts = tabCountsOf(response.data.meta);
                if (tabCounts) setListMeta(tabCounts);
                nextCursorRef.current = response.data.meta.next_cursor ?? null;
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
                if (payload.length < CONVERSATIONS_PER_PAGE || (cursor && !nextCursorRef.current)) {
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
        nextCursorRef.current = null;
        void fetchPage(1, false);
    }, [fetchPage]);

    // ?q= theo từ khoá đang tìm, kể cả sau khi mở hội thoại khác (URL đổi) — reload
    // vẫn về đúng danh sách đang lọc.
    useEffect(() => {
        if (!withConversationList) return;
        const current = `${window.location.pathname}${window.location.search}`;
        const next = withListSearchQuery(current, searchQuery);
        if (next !== current) {
            window.history.replaceState(window.history.state, '', `${next}${window.location.hash}`);
        }
    }, [searchQuery, page.url, withConversationList]);

    const loadMoreConversations = useCallback(() => {
        if (endReached || listLoading) return;
        void fetchPage(pageRef.current + 1, true);
    }, [endReached, listLoading, fetchPage]);

    const setStatusFilter = useCallback(
        (value: ConversationStatusFilter) => setListFilters({ status: value }),
        [setListFilters],
    );

    const setSortFilter = useCallback((value: string) => setListFilters({ sortBy: value }), [setListFilters]);

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

    // Lõi chung của nhánh URL ?messageId= và focusMessage: nạp đủ khoảng tới tin
    // đích trên danh sách cho trước (lỗi mạng coi như không thấy), rồi đánh dấu tin.
    const loadFocus = useCallback(
        (loaded: ConversationMessage[], targetId: number): Promise<FocusWindow> =>
            loadFocusWindow(loaded, targetId, messagesRangeOf(accountId, conversationId)).catch(() => ({
                messages: loaded,
                found: false,
            })),
        [accountId, conversationId],
    );
    const markFocus = useCallback((targetId: number, found: boolean) => {
        setFocusedMessageId(found ? targetId : null);
        if (!found) useAlert(t('CONVERSATION.JUMP_TO_MESSAGE_NOT_FOUND'));
    }, []);

    const focusMessage = useCallback(
        async (targetId: number) => {
            const loaded = messagesRef.current;
            const focus = await loadFocus(loaded, targetId);
            if (conversationIdRef.current !== conversationId) return;
            if (focus.messages !== loaded) {
                setMessages((current) => mergeMessagesChronologically(current, focus.messages));
            }
            markFocus(targetId, focus.found);
        },
        [conversationId, loadFocus, markFocus],
    );

    // Chọn conversation theo display_id trên URL: chưa có trong allConversations
    // thì fetch rồi đưa vào (getConversation gốc commit UPDATE_CONVERSATION).
    useEffect(() => {
        let cancelled = false;
        setFocusedMessageId(null);

        const { kept: keptUnsent, discardedEchoIds } = splitFailedUnsent(messagesRef.current, conversationId);
        discardedEchoIds.forEach((echoId) => unsentPayloadsRef.current.delete(echoId));

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

        setMessages(keptUnsent);
        setAllMessagesLoaded(false);
        setMessagesLoading(true);
        fetchMessages(accountId, conversationId).then(
            async (response) => {
                if (cancelled) return;
                const latest = response.payload;
                const focus = requestedFocusId ? await loadFocus(latest, requestedFocusId) : null;
                if (cancelled) return;
                setMessages((current) => withUnsentOf(focus?.messages ?? latest, current, conversationId));
                if (latest.length < 20) {
                    setAllMessagesLoaded(true);
                }
                if (requestedFocusId && focus) markFocus(requestedFocusId, focus.found);
                // Chỉ tắt trạng thái đang tải khi đã có đủ khoảng tới tin đích — khung
                // chat không kịp cuộn xuống đáy rồi mới nhảy.
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
        // allConversations cố tình không nằm trong deps: chỉ nạp lại khi đổi conversation
        // hoặc đổi tin cần mở tới trên URL.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accountId, conversationId, requestedFocusId]);

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
        let readOpenConversation = false;
        if (plainMessage.conversation_id === conversationIdRef.current) {
            // ADD_CONVERSATION_ATTACHMENTS: bản gốc góp tệp từ tin đến (realtime) và
            // từ phản hồi của lần gửi; ở yona tin mình gửi cũng quay lại qua realtime
            // nên chỉ cần một chỗ này.
            setAttachments((current) => appendMessageAttachments(current, plainMessage));
            // ADD_MESSAGE gốc chỉ phát SCROLL_TO_MESSAGE (→ makeMessagesRead) khi tin
            // thật sự nối vào cuối hội thoại đang mở, không phải khi thay tin pending.
            const appended = findPendingMessageIndex(messagesRef.current, plainMessage) === -1;
            setMessages((current) => applyIncomingMessage(current, plainMessage).messages);
            if (appended) readOpenConversation = true;
        }
        const withMessage = (item: Conversation) =>
            item.id === plainMessage.conversation_id
                ? applyMessageToConversation(
                      item,
                      plainMessage,
                      unreadCountAfterSeen(item.id, embedded?.unread_count ?? item.unread_count, plainMessage.created_at),
                  )
                : item;
        setAllConversations((current) => current.map(withMessage));
        setFilteredConversations((current) => current.map(withMessage));
        // Sau khi danh sách nhận số máy chủ gửi kèm tin: sự kiện đã xem phải là cập nhật cuối cùng.
        if (readOpenConversation) markMessagesReadRef.current(plainMessage.conversation_id, plainMessage.created_at);
    }, []);

    const conversationTypeRef = useRef<ConversationType>(conversationType);
    conversationTypeRef.current = conversationType;
    const inboxIdRef = useRef(inboxId);
    inboxIdRef.current = inboxId;

    const updateConversation = useCallback((incoming: Conversation) => {
        if (!incoming?.id) return;
        const conversation = {
            ...incoming,
            unread_count: unreadCountAfterSeen(incoming.id, incoming.unread_count, incoming.timestamp ?? incoming.last_activity_at),
        };
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

    // Xem hội thoại là phát sự kiện đã xem chung ngay, không chờ server: danh sách,
    // chuông cùng tắt chấm qua sự kiện đó. Lỗi mạng thì lần tải danh sách sau tự hiện lại chấm.
    const markMessagesRead = useCallback(
        async (targetId: number, seenThrough = 0) => {
            if (!targetId) return;
            const target = allConversationsRef.current.find((item) => item.id === targetId);
            markConversationSeen(targetId, (target?.unread_count ?? 0) > 0, seenThrough, target?.inbox_id);
            try {
                await markMessagesReadRequest(accountId, targetId);
                scheduleUnreadCountRefresh();
            } catch {
                // Không báo lỗi cho người dùng: đánh dấu đã đọc là việc nền.
            }
        },
        [accountId],
    );

    const markMessagesUnread = useCallback(
        async (targetId: number) => {
            if (!targetId) return;
            await markMessagesUnreadRequest(accountId, targetId);
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
        [accountId],
    );

    markMessagesReadRef.current = markMessagesRead;

    // Tin vào hội thoại đang mở được đánh dấu đọc ngay khi tới: báo store số chưa đọc
    // để chuông và tiêu đề tab không nháy số của thông báo sắp đọc.
    useEffect(() => {
        setViewedConversation(conversationId);
        return () => setViewedConversation(0);
    }, [conversationId]);

    // Tin vào hội thoại chưa nạp (nằm ngoài các trang đã tải) không kèm sự kiện hội thoại nào
    // khi waiting_since không đổi, nên phải tự kéo hội thoại về để thẻ hiện lên đầu danh sách.
    const unloadedFetchesRef = useRef(new Set<number>());
    const pullUnloadedConversation = useCallback(
        (targetId: number) => {
            if (allConversationsRef.current.some((item) => item.id === targetId)) return;
            if (unloadedFetchesRef.current.has(targetId)) return;
            unloadedFetchesRef.current.add(targetId);
            fetchConversation(accountId, targetId)
                .then((fetched) => {
                    if (!shouldAddConversationToList(fetched, inboxIdRef.current, conversationTypeRef.current)) return;
                    setAllConversations((current) => applyConversationUpdate(current, fetched));
                }, () => undefined)
                .finally(() => unloadedFetchesRef.current.delete(targetId));
        },
        [accountId],
    );

    // Realtime → store: các event conversation/message.
    useRealtimeEvent<MessageEventPayload>('message.created', (message) => {
        pullUnloadedConversation(message.conversation_id);
        addMessage(message);
        const lastActivityAt = message.conversation?.last_activity_at;
        if (lastActivityAt) {
            setAllConversations((current) =>
                applyConversationLastActivity(current, message.conversation_id, lastActivityAt),
            );
        }
    });
    useRealtimeEvent<MessageEventPayload>('message.updated', addMessage);

    useRealtimeEvent<ConversationSeenPayload>(BUS_EVENTS.CONVERSATION_SEEN, ({ conversationId: seenId, seenAt }) => {
        setAllConversations((current) => applyUnreadCount(current, seenId, seenAt));
        setFilteredConversations((current) => applyUnreadCount(current, seenId, seenAt));
    });
    useRealtimeEvent(BUS_EVENTS.CONVERSATIONS_ALL_SEEN, () => {
        const seenAt = nowInSeconds();
        setAllConversations((current) => current.map((item) => (item.unread_count > 0 ? { ...item, agent_last_seen_at: seenAt, unread_count: 0 } : item)));
    });
    // Counts: ActionCableConnector emit 'fetch_conversation_stats' sau các event
    // created/status_changed/assignee.changed/updated/contact.deleted như gốc.
    useRealtimeEvent<Conversation>('conversation.created', (conversation) => {
        if (shouldAddConversationToList(conversation, inboxIds, conversationType)) {
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
    // onContactUpdate → contacts/updateContact: card, header và panel liên hệ
    // (useContactDetails theo meta.sender) cùng đổi, không cần tải lại trang.
    useContactUpdatedEvent<ContactMeta>((contact) => {
        setAllConversations((current) => applyContactUpdate(current, contact));
        setFilteredConversations((current) => applyContactUpdate(current, contact));
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
            const tabCounts = tabCountsOf(response.data.meta);
            if (tabCounts) setListMeta(tabCounts);
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
                return [...current, ...missing].sort(compareBySentAt);
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

    // Tin tạm gửi ở hội thoại nào thì đi về đúng hội thoại đó, kể cả khi đã chuyển sang hội thoại khác.
    const deliverPendingMessage = useCallback(
        (targetConversationId: number, echoId: string) => {
            const payload = unsentPayloadsRef.current.get(echoId);
            if (!payload) return Promise.resolve(false);

            return sendMessage(accountId, targetConversationId, { ...payload, echo_id: echoId }).then(
                (message) => {
                    unsentPayloadsRef.current.delete(echoId);
                    addMessage(message);
                    return true;
                },
                (error: unknown) => {
                    const body = (error as { body?: { error?: string } }).body;
                    const reason = body?.error || t('CONVERSATION.MESSAGE_ERROR');
                    setMessages((current) => markUnsentFailed(current, echoId, reason));
                    // Không còn bong bóng nào để bấm Gửi lại (đã rời hội thoại đó) thì bỏ luôn nội dung chờ.
                    if (!messagesRef.current.some((item) => item.echo_id === echoId)) {
                        unsentPayloadsRef.current.delete(echoId);
                    }
                    useAlert(reason);
                    return false;
                },
            );
        },
        [accountId, addMessage],
    );

    // createPendingMessageAndSend: chèn tin tạm (status progress) rồi thay bằng
    // bản server trả về; lỗi → tin tạm thành thất bại, giữ nội dung để gửi lại.
    // Mọi kiểu tin agent gửi từ khung soạn (chữ, tệp, sticker, thẻ) đi qua đây —
    // chỉ khác phần vá lên tin tạm.
    const enqueuePendingMessage = useCallback(
        (
            targetConversationId: number,
            targetInboxId: number,
            payload: Omit<SendMessagePayload, 'echo_id'>,
            pendingPatch: Partial<ConversationMessage>,
            { showPending = true }: { showPending?: boolean } = {},
        ) => {
            pendingEchoCounter += 1;
            const echoId = `${Date.now()}-${pendingEchoCounter}`;
            const pending: ConversationMessage = {
                id: -pendingEchoCounter,
                content: payload.content || null,
                inbox_id: targetInboxId,
                conversation_id: targetConversationId,
                message_type: MESSAGE_TYPES.OUTGOING,
                content_type: 'text',
                status: MESSAGE_STATUS.PROGRESS,
                content_attributes: payload.content_attributes ?? {},
                created_at: Math.floor(Date.now() / 1000),
                private: payload.private,
                source_id: null,
                echo_id: echoId,
                sender: {
                    id: currentUserId,
                    name: user.name,
                    type: 'user',
                    thumbnail: user.avatar_url ?? '',
                },
                ...pendingPatch,
            };
            if (showPending) setMessages((current) => [...current, pending]);
            unsentPayloadsRef.current.set(echoId, payload);
            return deliverPendingMessage(targetConversationId, echoId);
        },
        [currentUserId, user, deliverPendingMessage],
    );

    const [composeDraft, setComposeDraft] = useState<ComposeDraft>(EMPTY_COMPOSE_DRAFT);
    // Bản mới nhất ghi vào ref ngay lúc cập nhật (không chờ render), để hai lần bấm
    // gửi liền nhau thấy được cờ đang gửi của nhau.
    const composeDraftRef = useRef(composeDraft);
    const updateComposeDraft = useCallback(
        (patch: Partial<ComposeDraft> | ((draft: ComposeDraft) => Partial<ComposeDraft>)) => {
            const current = composeDraftRef.current;
            const changes = typeof patch === 'function' ? patch(current) : patch;
            const keys = Object.keys(changes) as (keyof ComposeDraft)[];
            if (keys.every((key) => Object.is(changes[key], current[key]))) return;
            const next = { ...current, ...changes };
            composeDraftRef.current = next;
            setComposeDraft(next);
        },
        [],
    );
    // Hội thoại tạo từ bản nháp — mọi kiểu gửi (chữ, tệp, sticker, thẻ) dùng chung một lần tạo.
    const draftConversationRef = useRef<Promise<Conversation> | null>(null);

    // Mỗi lần vào bản nháp (hoặc đổi người nhận điền sẵn, hoặc rời bản nháp) là một
    // phiên mới. Đặt lại ngay trong lúc render để hiệu ứng của khung nháp không bị
    // xoá sau khi chạy. Số phiên cho việc đang chạy dở biết người dùng còn ở đó không.
    const composeSessionKey = `${isComposing}:${composeContactId ?? ''}`;
    const [activeComposeSession, setActiveComposeSession] = useState(composeSessionKey);
    const composeSessionRef = useRef(0);
    if (activeComposeSession !== composeSessionKey) {
        setActiveComposeSession(composeSessionKey);
        setComposeDraft(EMPTY_COMPOSE_DRAFT);
        composeDraftRef.current = EMPTY_COMPOSE_DRAFT;
        draftConversationRef.current = null;
        composeSessionRef.current += 1;
    }

    const draftComposerRef = useRef<(() => DraftComposerContent) | null>(null);
    const registerDraftComposer = useCallback((readComposer: () => DraftComposerContent) => {
        draftComposerRef.current = readComposer;
        return () => {
            if (draftComposerRef.current === readComposer) draftComposerRef.current = null;
        };
    }, []);
    const carriedAttachmentsRef = useRef(new Map<number, PendingAttachment[]>());
    const takeCarriedAttachments = useCallback((targetConversationId: number) => {
        const carried = carriedAttachmentsRef.current.get(targetConversationId) ?? [];
        carriedAttachmentsRef.current.delete(targetConversationId);
        return carried;
    }, []);

    // Phần ô soạn chưa gửi đi theo sang hội thoại mới: chữ thành bản nháp của nó, tệp
    // chờ ô soạn của hội thoại đó lấy khi mở ra.
    const carryDraftComposer = useCallback((targetConversationId: number) => {
        const composer = draftComposerRef.current?.();
        if (!composer) return;
        if (composer.content) saveReplyDraft(draftKey(targetConversationId, composer.replyMode), composer.content);
        if (composer.attachments.length) carriedAttachmentsRef.current.set(targetConversationId, composer.attachments);
    }, []);

    const ensureConversation = useCallback((): Promise<Conversation> => {
        if (draftConversationRef.current) return draftConversationRef.current;

        const session = composeSessionRef.current;
        const creation: Promise<Conversation> = createConversationFromDraft(accountId, composeDraftRef.current, (contact) => {
            if (composeSessionRef.current === session) updateComposeDraft({ recipient: { kind: 'contact', contact } });
        }).catch((error: unknown) => {
            if (draftConversationRef.current === creation) draftConversationRef.current = null;
            throw error;
        });
        draftConversationRef.current = creation;
        return creation;
    }, [accountId, updateComposeDraft]);

    // Gửi từ bản nháp: tạo hội thoại, gửi tin vào đó qua đường chung, rồi mở hội
    // thoại thật — chỉ khi người dùng vẫn đang ở bản nháp này; đã sang chỗ khác thì
    // tin vẫn đi, chỉ báo kèm lối mở hội thoại mới. Tin gửi hỏng còn nguyên trong
    // hội thoại mới để Gửi lại. Gửi bằng sticker/thẻ thì chữ và tệp đang soạn đi theo.
    const sendFromDraft = useCallback(
        async (
            payload: Omit<SendMessagePayload, 'echo_id'>,
            pendingPatch: Partial<ConversationMessage>,
            sentFromComposer: boolean,
        ) => {
            const draft = composeDraftRef.current;
            if (draft.isSending) return;
            const blocker = draftBlocker(draft);
            if (blocker) {
                updateComposeDraft({ showErrors: true });
                useAlert(t(blocker));
                return;
            }

            const session = composeSessionRef.current;
            const isStillOnDraft = () => composeSessionRef.current === session;
            updateComposeDraft({ isSending: true, error: null });
            let conversation: Conversation;
            try {
                conversation = await ensureConversation();
            } catch (error: unknown) {
                const reason = parseApiErrorMessage(error) || t('COMPOSE_NEW_CONVERSATION.FORM.ERROR_MESSAGE');
                if (isStillOnDraft()) updateComposeDraft({ isSending: false, error: reason });
                useAlert(reason);
                return;
            }

            setAllConversations((current) => applyConversationUpdate(current, conversation));
            const targetUrl = conversationUrl({ accountId, filters: listFilters, teamId, id: conversation.id });
            const isOnDraftAtCreation = isStillOnDraft();
            if (isOnDraftAtCreation && !sentFromComposer) carryDraftComposer(conversation.id);

            const delivered = await enqueuePendingMessage(conversation.id, conversation.inbox_id, payload, pendingPatch, {
                showPending: isOnDraftAtCreation,
            });

            if (!isStillOnDraft()) {
                if (!delivered && payload.content) {
                    saveReplyDraft(draftKey(conversation.id, REPLY_EDITOR_MODES.REPLY), payload.content);
                }
                useAlert(t('COMPOSE_NEW_CONVERSATION.DRAFT.CREATED_ELSEWHERE'), {
                    message: t('COMPOSE_NEW_CONVERSATION.DRAFT.OPEN_CONVERSATION'),
                    onClick: () => router.visit(targetUrl),
                });
                return;
            }

            const releaseSending = () => {
                if (isStillOnDraft()) updateComposeDraft({ isSending: false });
            };
            router.visit(targetUrl, {
                preserveState: true,
                preserveScroll: true,
                // Inertia không gọi onFinish cho lượt bị huỷ.
                onCancel: releaseSending,
                onFinish: releaseSending,
            });
        },
        [accountId, listFilters, teamId, ensureConversation, enqueuePendingMessage, carryDraftComposer, updateComposeDraft],
    );

    const sendWithPendingMessage = useCallback(
        (
            payload: Omit<SendMessagePayload, 'echo_id'>,
            pendingPatch: Partial<ConversationMessage> = {},
            sentFromComposer = false,
        ) => {
            if (conversationId && selectedConversation) {
                void enqueuePendingMessage(conversationId, selectedConversation.inbox_id, payload, pendingPatch);
                return;
            }
            if (isComposing) void sendFromDraft(payload, pendingPatch, sentFromComposer);
        },
        [conversationId, selectedConversation, isComposing, enqueuePendingMessage, sendFromDraft],
    );

    const sendReply = useCallback(
        ({
            content,
            isPrivate,
            cc_emails: ccEmails,
            bcc_emails: bccEmails,
            to_emails: toEmails,
            contentAttributes,
            attachments = [],
            isVoiceMessage = false,
        }: {
            content: string;
            isPrivate: boolean;
            cc_emails?: string;
            bcc_emails?: string;
            to_emails?: string;
            contentAttributes?: Record<string, unknown>;
            attachments?: OutgoingAttachment[];
            isVoiceMessage?: boolean;
        }) => {
            sendWithPendingMessage(
                {
                    content,
                    private: isPrivate,
                    ...(contentAttributes ? { content_attributes: contentAttributes } : {}),
                    ...(attachments.length ? { files: attachments.map((attachment) => attachment.file) } : {}),
                    ...(isVoiceMessage ? { is_voice_message: true } : {}),
                    ...(ccEmails !== undefined ? { cc_emails: ccEmails } : {}),
                    ...(bccEmails !== undefined ? { bcc_emails: bccEmails } : {}),
                    ...(toEmails !== undefined ? { to_emails: toEmails } : {}),
                },
                attachments.length ? { attachments: pendingAttachments(attachments) } : {},
                true,
            );
        },
        [sendWithPendingMessage],
    );

    // Tin pending mang sẵn ảnh sticker để bong bóng hiện ngay, cùng hình dạng máy
    // chủ sẽ trả (content_type sticker + một đính kèm ảnh).
    const sendSticker = useCallback(
        (sticker: StickerItem) => {
            sendWithPendingMessage(
                { private: false, content_type: 'sticker', sticker_id: sticker.id },
                {
                    content_type: 'sticker',
                    attachments: [{ id: -1, file_type: 'image', data_url: sticker.image_url, thumb_url: sticker.image_url }],
                },
            );
        },
        [sendWithPendingMessage],
    );

    const sendStructured = useCallback(
        (contentType: string, contentAttributes: Record<string, unknown>, content?: string) => {
            sendWithPendingMessage(
                { private: false, content, content_type: contentType, content_attributes: contentAttributes },
                { content_type: contentType },
            );
        },
        [sendWithPendingMessage],
    );

    // Gửi lại tin thất bại. Tin quay về qua chính đường ADD_MESSAGE nên trạng
    // thái/lý do lỗi cập nhật một chỗ như tin gửi mới.
    const retryFailedMessage = useCallback(
        async (message: ConversationMessage) => {
            if (!conversationId || !message.id) return;
            if (isUnsentMessageId(message.id)) {
                const echoId = message.echo_id;
                if (!echoId || !unsentPayloadsRef.current.has(echoId)) return;
                setMessages((current) => markUnsentSending(current, echoId));
                deliverPendingMessage(message.conversation_id, echoId);
                return;
            }
            try {
                addMessage(await retryMessage(accountId, conversationId, message.id));
            } catch (error: unknown) {
                const body = (error as { body?: { error?: string } }).body;
                useAlert(body?.error || t('CONVERSATION.MESSAGE_FAILURE.RETRY_FAILED'));
            }
        },
        [accountId, conversationId, addMessage, deliverPendingMessage],
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
            if (isUnsentMessageId(message.id)) {
                const echoId = message.echo_id;
                if (!echoId) return;
                unsentPayloadsRef.current.delete(echoId);
                setMessages((current) => removeUnsent(current, echoId));
                return;
            }
            try {
                addMessage(await deleteMessage(accountId, conversationId, message.id));
            } catch (error: unknown) {
                const body = (error as { body?: { error?: string } }).body;
                useAlert(body?.error || t('CONVERSATION.MESSAGE_ERROR'));
            }
        },
        [accountId, conversationId, addMessage],
    );

    // Đánh dấu thẻ chuyển khoản đã nhận tiền. Idempotent phía server — bấm lại
    // vẫn gọi được, chỉ không đổi gì thêm.
    const markBankTransferPaid = useCallback(
        async (message: ConversationMessage) => {
            if (!conversationId || !message.id) return;
            try {
                addMessage(await markBankTransferPaidRequest(accountId, conversationId, message.id));
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

    const setConversationPinned = useCallback(
        async (targetId: number, pinned: boolean) => {
            const previous = visibleConversationsRef.current.find(item => item.id === targetId)
                ?? allConversationsRef.current.find(item => item.id === targetId);
            const previousPinState = { pinned: previous?.pinned ?? false, pin_position: previous?.pin_position ?? null };

            setAllConversations(current => applyConversationPinned(current, targetId, pinned));
            setFilteredConversations(current => applyConversationPinned(current, targetId, pinned));
            try {
                await setConversationPinnedRequest(accountId, targetId, pinned);
            } catch {
                setAllConversations(current => applyPinState(current, targetId, previousPinState));
                setFilteredConversations(current => applyPinState(current, targetId, previousPinState));
                useAlert(t(pinned ? 'CONVERSATION.CARD_CONTEXT_MENU.PIN_ERROR' : 'CONVERSATION.CARD_CONTEXT_MENU.UNPIN_ERROR'));
            }
        },
        [accountId],
    );

    const reorderPinnedConversations = useCallback(
        async (orderedIds: number[]) => {
            const visible = visibleConversationsRef.current;
            const previousPositions = new Map(
                visible.filter(item => orderedIds.includes(item.id)).map(item => [item.id, item.pin_position ?? null]),
            );
            const applyPositions = (positions: Map<number, number | null>) => {
                setAllConversations(current => applyPinPositions(current, positions));
                setFilteredConversations(current => applyPinPositions(current, positions));
            };

            applyPositions(pinPositionsForOrder(visible, orderedIds));
            try {
                const saved = await reorderPinnedConversationsRequest(accountId, orderedIds);
                applyPositions(new Map(saved.map(item => [item.id, item.pin_position])));
            } catch {
                applyPositions(previousPositions);
                useAlert(t('CONVERSATION.CARD_CONTEXT_MENU.REORDER_PIN_ERROR'));
            }
        },
        [accountId],
    );

    const value = useMemo<ConversationContextValue>(
        () => ({
            accountId,
            currentUserId,
            listFilters,
            setListFilters,
            teamId,
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
            listQuery,
            searchQuery,
            setSearchQuery,
            selectedConversation,
            messages,
            allMessagesLoaded,
            messagesLoading,
            focusedMessageId,
            clearFocusedMessage,
            focusMessage,
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
            sendSticker,
            sendStructured,
            retryFailedMessage,
            toggleMessageReaction,
            deleteConversationMessage,
            markBankTransferPaid,
            toggleTypingStatus,
            toggleStatus,
            togglePriority,
            assignAgent,
            assignTeam,
            muteConversation,
            unmuteConversation,
            markMessagesRead,
            markMessagesUnread,
            setConversationPinned,
            reorderPinnedConversations,
            updateConversationCustomAttributes,
            isComposing,
            composeContactId,
            composeDraft,
            updateComposeDraft,
            registerDraftComposer,
            takeCarriedAttachments,
        }),
        [
            accountId,
            currentUserId,
            listFilters,
            setListFilters,
            teamId,
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
            listQuery,
            searchQuery,
            setSearchQuery,
            selectedConversation,
            messages,
            allMessagesLoaded,
            messagesLoading,
            focusedMessageId,
            clearFocusedMessage,
            focusMessage,
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
            sendSticker,
            sendStructured,
            retryFailedMessage,
            toggleMessageReaction,
            deleteConversationMessage,
            markBankTransferPaid,
            toggleTypingStatus,
            toggleStatus,
            togglePriority,
            assignAgent,
            assignTeam,
            muteConversation,
            unmuteConversation,
            markMessagesRead,
            markMessagesUnread,
            setConversationPinned,
            reorderPinnedConversations,
            updateConversationCustomAttributes,
            isComposing,
            composeContactId,
            composeDraft,
            updateComposeDraft,
            registerDraftComposer,
            takeCarriedAttachments,
        ],
    );

    return <ConversationContext.Provider value={value}>{children}</ConversationContext.Provider>;
}
