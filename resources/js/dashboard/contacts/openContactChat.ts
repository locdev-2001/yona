import { router } from '@inertiajs/react';

import { fetchContactConversations } from 'dashboard/conversation/panelApi';
import { composeConversationUrl, conversationUrl } from 'dashboard/helper/URLHelper';

// Nhắn tin với một người: mở hội thoại gần nhất, chưa có thì soạn hội thoại mới.
export async function openContactChat(accountId: number, contactId: number): Promise<void> {
    const conversations = await fetchContactConversations(accountId, contactId).catch(() => []);
    const latest = conversations[0];
    router.visit(latest ? conversationUrl({ accountId, id: latest.id }) : composeConversationUrl({ accountId, contactId }));
}
