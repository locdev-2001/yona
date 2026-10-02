import type { Conversation, ConversationMessage } from './types';

// Phần thuần của cụm "chưa đọc": mutation UPDATE_MESSAGE_UNREAD_COUNT,
// nhãn pill của MessagesView.vue và nhịp debounce của conversationStats.js.

// UPDATE_MESSAGE_UNREAD_COUNT của store/modules/conversations/index.js.
export function applyUnreadCount(
    conversations: Conversation[],
    conversationId: number,
    lastSeen: number,
    unreadCount = 0,
): Conversation[] {
    return conversations.map((conversation) =>
        conversation.id === conversationId
            ? { ...conversation, agent_last_seen_at: lastSeen, unread_count: unreadCount }
            : conversation,
    );
}

// getUnreadMessages của helper/conversationHelper.js.
export function unreadMessages(
    messages: ConversationMessage[],
    agentLastSeenAt: number,
): ConversationMessage[] {
    return messages.filter((message) => message.created_at * 1000 > agentLastSeenAt * 1000);
}

// `:first-unread-id` + `v-show="unreadMessageCount != 0"` của MessagesView.vue gộp
// lại: MessageList chỉ chèn pill trước tin chưa đọc đầu tiên khi còn tin chưa đọc.
export function firstUnreadMessageId(
    messages: ConversationMessage[],
    agentLastSeenAt: number,
    unreadCount: number,
): number | null {
    if (unreadCount === 0) return null;
    return unreadMessages(messages, agentLastSeenAt)[0]?.id ?? null;
}

// unreadMessageLabel của MessagesView.vue — trả về phần đếm + khóa i18n để
// component tự dịch (t() không dùng được trong hàm thuần đem đi test).
export function unreadMessageLabelParts(unreadCount: number): { count: string; i18nKey: string } {
    return {
        count: unreadCount > 9 ? '9+' : String(unreadCount),
        i18nKey: unreadCount > 1 ? 'CONVERSATION.UNREAD_MESSAGES' : 'CONVERSATION.UNREAD_MESSAGE',
    };
}

export type MetaDebounceKey = 'default' | 'long' | 'superLong';

// getMetaDebounceKey của store/modules/conversationStats.js: allCount = 0 nghĩa là
// chưa có lần meta nào thành công → coi như account lớn và hỏi thưa nhất.
export function getMetaDebounceKey(allCount: number): MetaDebounceKey {
    if (allCount > 2000 || allCount === 0) return 'superLong';
    if (allCount > 100) return 'long';
    return 'default';
}

export interface UnreadSnapshot {
    conversationId: number;
    count: number;
    lastSeenAt: number;
}

// Chụp trạng thái chưa đọc lúc mở hội thoại, trước khi bị đánh dấu đã đọc.
export function unreadSnapshotOf(conversation: Pick<Conversation, 'id' | 'unread_count' | 'agent_last_seen_at'>): UnreadSnapshot {
    return {
        conversationId: conversation.id,
        count: conversation.unread_count || 0,
        lastSeenAt: conversation.agent_last_seen_at,
    };
}
