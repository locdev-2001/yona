import { MESSAGE_STATUS, MESSAGE_TYPES } from './constants';
import { messageSentAt } from './messageTime';
import type { Conversation, ConversationMessage } from './types';

// Hàm thuần cập nhật danh sách hội thoại và khung tin từ phản hồi API hoặc sự kiện
// realtime. ConversationContext chỉ gọi các hàm này, không tự sửa mảng tại chỗ.

// Tin máy chủ trả về không phụ thuộc người xem; ở đây mới quyết tin của mình (phải)
// hay của người khác (trái). Tin hệ thống giữ nguyên.
export function toViewerMessage(message: ConversationMessage, currentUserId: number): ConversationMessage {
    if (message.message_type === MESSAGE_TYPES.ACTIVITY) return message;

    return {
        ...message,
        message_type: message.sender_id === currentUserId ? MESSAGE_TYPES.OUTGOING : MESSAGE_TYPES.INCOMING,
    };
}

export function toViewerConversation(conversation: Conversation, currentUserId: number): Conversation {
    const lastMessage = conversation.last_non_activity_message;
    return lastMessage ? { ...conversation, last_non_activity_message: toViewerMessage(lastMessage, currentUserId) } : conversation;
}

// Tin tạm (id âm) và bản máy chủ của nó khớp nhau qua echo_id.
export function findPendingMessageIndex(messages: ConversationMessage[], message: ConversationMessage): number {
    return messages.findIndex(item => item.id === message.id || (!!message.echo_id && item.echo_id === message.echo_id));
}

export interface IncomingMessageResult {
    messages: ConversationMessage[];
    appended: boolean;
}

// Thay tin tạm/đã có bằng bản máy chủ, không thì nối vào cuối.
export function applyIncomingMessage(messages: ConversationMessage[], message: ConversationMessage): IncomingMessageResult {
    const pendingIndex = findPendingMessageIndex(messages, message);
    if (pendingIndex !== -1) {
        const next = messages.slice();
        next[pendingIndex] = message;
        return { messages: next, appended: false };
    }
    return { messages: [...messages, message], appended: true };
}

export function sortConversations(conversations: Conversation[]): Conversation[] {
    return [...conversations].sort((a, b) => b.last_activity_at - a.last_activity_at || b.id - a.id);
}

// Thêm hoặc thay một hội thoại rồi xếp lại theo hoạt động mới nhất.
export function upsertConversation(conversations: Conversation[], conversation: Conversation): Conversation[] {
    return sortConversations([...conversations.filter(item => item.id !== conversation.id), conversation]);
}

// Tin mới đổi dòng xem trước, giờ, và số chưa đọc (khi không phải tin của mình và
// hội thoại không đang mở).
export function applyMessageToConversation(
    conversation: Conversation,
    message: ConversationMessage,
    { isOpen }: { isOpen: boolean },
): Conversation {
    const current = conversation.last_non_activity_message;
    if (current && current.id !== message.id && messageSentAt(current) > messageSentAt(message)) return conversation;

    const isNewIncoming = message.message_type === MESSAGE_TYPES.INCOMING && current?.id !== message.id;
    const sentAt = messageSentAt(message);

    return {
        ...conversation,
        last_non_activity_message: message,
        last_activity_at: Math.max(conversation.last_activity_at, sentAt),
        timestamp: Math.max(conversation.timestamp, sentAt),
        unread_count: isNewIncoming && !isOpen ? conversation.unread_count + 1 : conversation.unread_count,
    };
}

// Người kia đã xem tới tin `readUpToId`: tin của mình tới đó chuyển sang "đã xem".
export function applyReadReceipt(messages: ConversationMessage[], readUpToId: number): ConversationMessage[] {
    return messages.map(message =>
        message.message_type === MESSAGE_TYPES.OUTGOING && message.id > 0 && message.id <= readUpToId && message.status !== MESSAGE_STATUS.READ
            ? { ...message, status: MESSAGE_STATUS.READ }
            : message,
    );
}
