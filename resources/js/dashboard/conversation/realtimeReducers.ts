import type { MessageAttachment } from 'dashboard/components-next/message/helpers/attachments';
import { CONVERSATION_TYPE, MESSAGE_STATUS, MESSAGE_TYPES } from './constants';
import type { ConversationType } from './constants';
import { matchesLabels } from './labelHelpers';
import type { AssigneeTab, ContactMeta, Conversation, ConversationMessage } from './types';

// Hàm thuần port từ store conversations của Chatwoot (mutations ADD_MESSAGE /
// UPDATE_CONVERSATION / SET_ALL_CONVERSATION, action addConversation, getters
// getMineChats/getUnAssignedChats/getAllStatusChats + helpers applyPageFilters,
// sortComparator). Tách khỏi provider để test không cần React.

// findPendingMessageIndex gốc: khớp theo id hoặc id tạm (= echo_id) của tin pending.
export function findPendingMessageIndex(messages: ConversationMessage[], message: ConversationMessage): number {
    return messages.findIndex(
        (item) => item.id === message.id || (!!message.echo_id && item.echo_id === message.echo_id),
    );
}

export interface IncomingMessageResult {
    messages: ConversationMessage[];
    appended: boolean;
}

// ADD_MESSAGE: thay tin pending/đã có bằng bản server, không thì nối vào cuối.
export function applyIncomingMessage(
    messages: ConversationMessage[],
    message: ConversationMessage,
): IncomingMessageResult {
    const pendingIndex = findPendingMessageIndex(messages, message);
    if (pendingIndex !== -1) {
        const next = messages.slice();
        next[pendingIndex] = message;
        return { messages: next, appended: false };
    }
    return { messages: [...messages, message], appended: true };
}

// Phần ADD_MESSAGE tác động lên card trong list: timestamp + unread_count từ
// conversation nhúng trong push_event_data; kèm last_non_activity_message để
// preview card đổi (getLastMessage đọc từ messages[] + last_non_activity_message).
export function applyMessageToConversation(
    conversation: Conversation,
    message: ConversationMessage,
    unreadCount: number,
): Conversation {
    const lastNonActivity =
        message.message_type === MESSAGE_TYPES.ACTIVITY ? conversation.last_non_activity_message : message;
    return {
        ...conversation,
        timestamp: message.created_at,
        unread_count: unreadCount,
        last_non_activity_message: lastNonActivity,
        messages: [message],
        can_reply: message.message_type === MESSAGE_TYPES.INCOMING ? true : conversation.can_reply,
    };
}

// UPDATE_CONVERSATION_LAST_ACTIVITY.
export function applyConversationLastActivity(
    conversations: Conversation[],
    conversationId: number,
    lastActivityAt: number,
): Conversation[] {
    return conversations.map((item) =>
        item.id === conversationId ? { ...item, last_activity_at: lastActivityAt } : item,
    );
}

// Danh sách lọc theo mention/participating chỉ chứa hội thoại server đã lọc, nên
// mọi đường "tự thêm hội thoại lạ" đều bị chặn (mutation UPDATE_CONVERSATION +
// action addConversation của gốc).
const SERVER_FILTERED_TYPES: string[] = [CONVERSATION_TYPE.MENTION, CONVERSATION_TYPE.PARTICIPATING];

// UPDATE_CONVERSATION: bỏ event cũ hơn (updated_at), giữ messages đang có;
// chưa có trong list thì thêm, trừ khi đang ở tab mention/participating.
export function applyConversationUpdate(
    conversations: Conversation[],
    incoming: Conversation,
    conversationType: ConversationType = '',
): Conversation[] {
    const index = conversations.findIndex((item) => item.id === incoming.id);
    if (index === -1) {
        return SERVER_FILTERED_TYPES.includes(conversationType) ? conversations : [...conversations, incoming];
    }

    const existing = conversations[index];
    if (incoming.updated_at < existing.updated_at) {
        return conversations;
    }

    const { messages: _ignored, ...updates } = incoming;
    void _ignored;
    const next = conversations.slice();
    next[index] = { ...existing, ...updates };
    return next;
}

// ADD_CONVERSATION (idempotent) sau điều kiện của action addConversation: đang
// xem một inbox thì chỉ nhận conversation thuộc inbox đó; các màn lọc ở server
// (mention/participating/unattended) không tự thêm hội thoại mới.
export function shouldAddConversationToList(
    conversation: Conversation,
    currentInboxId: number,
    conversationType: ConversationType = '',
): boolean {
    if (conversationType) return false;

    return !currentInboxId || Number(currentInboxId) === conversation.inbox_id;
}

export function applyConversationAdded(conversations: Conversation[], conversation: Conversation): Conversation[] {
    return conversations.some((item) => item.id === conversation.id)
        ? conversations
        : [...conversations, conversation];
}

// SET_ALL_CONVERSATION khi reconnect: thêm mới, thay cái đã có, riêng
// conversation đang mở thì giữ messages hiện tại.
export function mergeFetchedConversations(
    conversations: Conversation[],
    fetched: Conversation[],
    selectedConversationId: number,
): Conversation[] {
    const next = conversations.slice();
    fetched.forEach((conversation) => {
        const index = next.findIndex((item) => item.id === conversation.id);
        if (index < 0) {
            next.push(conversation);
        } else if (conversation.id !== selectedConversationId) {
            next[index] = conversation;
        } else {
            next[index] = { ...conversation, messages: next[index].messages };
        }
    });
    return next;
}

// UPDATE_CONVERSATION_CONTACT.
export function applyConversationContact(
    conversations: Conversation[],
    conversationId: number,
    sender: Conversation['meta']['sender'],
): Conversation[] {
    return conversations.map((item) =>
        item.id === conversationId ? { ...item, meta: { ...item.meta, sender } } : item,
    );
}

// Payload contact.updated = push_event_data của contact + phong bì broadcast
// (account_id, performer khi agent thao tác) — phong bì không thuộc về khách.
export type ContactUpdatedPayload = ContactMeta & { account_id?: number; performer?: unknown };

// EDIT_CONTACT (onContactUpdate): bản gốc đọc khách của card/header/panel từ store
// contacts theo meta.sender.id; ở đây các chỗ đó đọc thẳng meta.sender nên đổi
// sender của mọi hội thoại cùng khách. Trộn vào sender cũ để giữ các trường
// payload không mang (availability_status…).
export function applyContactUpdate(conversations: Conversation[], contact: ContactUpdatedPayload): Conversation[] {
    const { account_id: _accountId, performer: _performer, ...contactFields } = contact;
    void _accountId;
    void _performer;
    const belongsToContact = (item: Conversation) => item.meta?.sender?.id === contact.id;
    if (!conversations.some(belongsToContact)) return conversations;

    return conversations.map((item) =>
        belongsToContact(item)
            ? { ...item, meta: { ...item.meta, sender: { ...item.meta.sender, ...contactFields } } }
            : item,
    );
}

export interface ConversationViewFilters {
    assigneeTab: AssigneeTab;
    status: string;
    inboxId: number;
    teamId: number;
    currentUserId: number;
    // filters.labels của applyPageFilters — trang /label/{title}.
    labels?: string[];
}

// applyPageFilters + nhánh tab của getMineChats/getUnAssignedChats/getAllStatusChats.
export function matchesConversationView(conversation: Conversation, filters: ConversationViewFilters): boolean {
    const { assigneeTab, status, inboxId, teamId, currentUserId, labels = [] } = filters;
    const assignee = conversation.meta?.assignee;

    if (assigneeTab === 'me' && !(assignee && assignee.id === currentUserId)) return false;
    if (assigneeTab === 'unassigned' && assignee) return false;

    if (status !== 'all' && conversation.status !== status) return false;
    if (inboxId && Number(inboxId) !== conversation.inbox_id) return false;
    if (teamId && Number(teamId) !== conversation.meta?.team?.id) return false;
    if (labels.length && !matchesLabels(conversation.labels, labels)) return false;

    return true;
}

const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };

type SortDirection = 'asc' | 'desc';
type SortMethod = (a: Conversation, b: Conversation, direction: SortDirection) => number;

const directional = (direction: SortDirection) => (valueA: number, valueB: number) =>
    direction === 'asc' ? valueA - valueB : valueB - valueA;

const SORT_METHODS: Record<string, SortMethod> = {
    sortOnLastActivityAt: (a, b, direction) => directional(direction)(a.last_activity_at, b.last_activity_at),
    sortOnCreatedAt: (a, b, direction) => directional(direction)(a.created_at, b.created_at),
    sortOnPriority: (a, b, direction) => {
        const defaultForNull = direction === 'asc' ? 5 : 0;
        const p1 = PRIORITY_ORDER[a.priority ?? ''] || defaultForNull;
        const p2 = PRIORITY_ORDER[b.priority ?? ''] || defaultForNull;
        return directional(direction)(p1, p2);
    },
    sortOnPriorityCreatedAt: (a, b) => {
        const p1 = PRIORITY_ORDER[a.priority ?? ''] || 0;
        const p2 = PRIORITY_ORDER[b.priority ?? ''] || 0;
        if (p1 !== p2) return p2 - p1;
        return a.created_at - b.created_at;
    },
    sortOnWaitingSince: (a, b, direction) => {
        const compare = directional(direction);
        if (!a.waiting_since || !b.waiting_since) {
            if (!a.waiting_since && !b.waiting_since) {
                return compare(a.created_at, b.created_at);
            }
            return compare(a.waiting_since ? 0 : 1, b.waiting_since ? 0 : 1);
        }
        return compare(a.waiting_since, b.waiting_since);
    },
};

const SORT_OPTIONS: Record<string, [keyof typeof SORT_METHODS, SortDirection]> = {
    last_activity_at_asc: ['sortOnLastActivityAt', 'asc'],
    last_activity_at_desc: ['sortOnLastActivityAt', 'desc'],
    created_at_asc: ['sortOnCreatedAt', 'asc'],
    created_at_desc: ['sortOnCreatedAt', 'desc'],
    priority_asc: ['sortOnPriority', 'asc'],
    priority_desc: ['sortOnPriority', 'desc'],
    waiting_since_asc: ['sortOnWaitingSince', 'asc'],
    waiting_since_desc: ['sortOnWaitingSince', 'desc'],
    priority_desc_created_at_asc: ['sortOnPriorityCreatedAt', 'desc'],
};

export function sortComparator(a: Conversation, b: Conversation, sortKey: string): number {
    const [method, direction] = SORT_OPTIONS[sortKey] || SORT_OPTIONS.last_activity_at_desc;
    return SORT_METHODS[method](a, b, direction);
}

// Tương đương getter đọc list theo tab hiện tại: lọc rồi sort ở client, để
// update realtime (đổi assignee/status) tự đưa conversation vào/ra list.
export function selectVisibleConversations(
    conversations: Conversation[],
    filters: ConversationViewFilters,
    sortKey: string,
): Conversation[] {
    return conversations
        .filter((conversation) => matchesConversationView(conversation, filters))
        .sort((a, b) => sortComparator(a, b, sortKey));
}

// ADD_CONVERSATION_ATTACHMENTS: tin đã gửi xong mới góp tệp vào accordion
// Attachments, và không thêm trùng tệp đã có.
export function appendMessageAttachments(
    attachments: MessageAttachment[],
    message: ConversationMessage,
): MessageAttachment[] {
    const incoming = (message.attachments ?? []) as unknown as MessageAttachment[];
    if (message.status !== MESSAGE_STATUS.SENT || !incoming.length) return attachments;

    const known = new Set(attachments.map((item) => item.id));
    const added = incoming.filter((item) => !known.has(item.id));

    return added.length ? [...attachments, ...added] : attachments;
}
