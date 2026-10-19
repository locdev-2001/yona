import { useCallback } from 'react';
import { router } from '@inertiajs/react';

import { conversationListPageURL } from 'dashboard/helper/URLHelper';
import { useConversation } from './ConversationContext';

// Đánh dấu chưa đọc rồi quay về danh sách: ở lại hội thoại thì nó bị đánh dấu đã đọc ngay.
export function useMarkUnreadAndLeave(conversationType = '') {
    const { accountId, listFilters, teamId, markMessagesUnread } = useConversation();

    return useCallback(
        (conversationId: number) =>
            markMessagesUnread(conversationId).then(
                () => router.visit(conversationListPageURL({ accountId, filters: listFilters, teamId, conversationType })),
                () => undefined,
            ),
        [accountId, listFilters, teamId, conversationType, markMessagesUnread],
    );
}
