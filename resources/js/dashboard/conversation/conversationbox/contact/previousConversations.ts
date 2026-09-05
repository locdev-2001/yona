import type { Conversation } from '../../types';

// previousConversations của ContactConversations.vue: bỏ chính hội thoại đang mở
// khỏi danh sách hội thoại của contact.
export function filterPreviousConversations(
    conversations: Conversation[],
    currentConversationId: number | string,
): Conversation[] {
    return conversations.filter(conversation => conversation.id !== Number(currentConversationId));
}

// showInboxName của ContactConversations.vue: chỉ hiện tên inbox khi đang ở màn
// tổng (không lọc theo inbox) và account có nhiều hơn một inbox.
export function shouldShowInboxName(activeInboxId: number, inboxCount: number): boolean {
    return !activeInboxId && inboxCount > 1;
}
