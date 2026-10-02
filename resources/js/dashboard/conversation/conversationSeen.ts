import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';

// Một sự kiện chung "người dùng đã xem hội thoại": danh sách, chuông, tiêu đề tab và
// mọi chỗ hiện chấm chưa đọc cùng nghe sự kiện này, không chỗ nào tự trừ số riêng.
// Mốc đã xem giữ ở module để dữ liệu máy chủ tới muộn (tin vừa đánh dấu đọc nhưng
// payload còn mang unread_count cũ) không làm chấm hiện lại.

export interface ConversationSeenPayload {
    conversationId: number;
    seenAt: number;
    hadUnread: boolean;
}

const seenAtByConversation = new Map<number, number>();

export function nowInSeconds(): number {
    return Math.floor(Date.now() / 1000);
}

export function markConversationSeen(conversationId: number, hadUnread: boolean, seenThrough = 0): ConversationSeenPayload {
    const seenAt = Math.max(nowInSeconds(), seenThrough, seenAtByConversation.get(conversationId) ?? 0);
    seenAtByConversation.set(conversationId, seenAt);
    const payload = { conversationId, seenAt, hadUnread };
    emitter.emit(BUS_EVENTS.CONVERSATION_SEEN, payload);

    return payload;
}

// Số chưa đọc máy chủ gửi, trừ khi người dùng đã xem tới sau tin cuối của hội thoại.
export function unreadCountAfterSeen(conversationId: number, serverUnreadCount: number, latestMessageAt: number): number {
    const seenAt = seenAtByConversation.get(conversationId);

    return seenAt !== undefined && seenAt >= latestMessageAt ? 0 : serverUnreadCount;
}

export function forgetConversationSeen(conversationId?: number): void {
    if (conversationId === undefined) {
        seenAtByConversation.clear();
        return;
    }
    seenAtByConversation.delete(conversationId);
}
