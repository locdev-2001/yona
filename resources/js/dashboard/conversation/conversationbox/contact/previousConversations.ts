import type { Conversation } from '../../types';

// previousConversations của ContactConversations.vue: bỏ chính hội thoại đang mở
// khỏi danh sách hội thoại của contact.
export function filterPreviousConversations(
    conversations: Conversation[],
    currentConversationId: number | string,
): Conversation[] {
    return conversations.filter(conversation => conversation.id !== Number(currentConversationId));
}

// showInboxName của ContactConversations.vue chỉ hiện tên inbox khi đang ở màn
// tổng. Lệch có chủ đích (ux-deviations.md): hội thoại trước của khách trải trên
// MỌI inbox (docs/channel-capabilities.md §2.5 threading_history), nên khi đang
// lọc theo một inbox vẫn phải thấy hội thoại cũ đó thuộc kênh nào.
export function shouldShowInboxName(_activeInboxId: number, inboxCount: number): boolean {
    return inboxCount > 1;
}
