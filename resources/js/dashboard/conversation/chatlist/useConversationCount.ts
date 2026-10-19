import { useCallback, useEffect, useState } from 'react';

import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import { fetchConversationMeta } from '../api';
import { ASSIGNEE_TYPE, SORT_BY_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import type { ConversationStatusFilter } from '../types';

// Số hội thoại của một trạng thái không phải trạng thái đang xem (danh sách đang xem
// đã có số của nó trong meta). Đếm lại khi danh sách hay trạng thái hội thoại đổi.
export function useConversationCount(status: ConversationStatusFilter): number {
    const { accountId, conversations } = useConversation();
    const [count, setCount] = useState(0);

    const refresh = useCallback(() => {
        fetchConversationMeta({ accountId, assigneeType: ASSIGNEE_TYPE.ALL, status, sortBy: SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC })
            .then(({ meta }) => setCount(meta.all_count))
            .catch(() => undefined);
    }, [accountId, status]);

    useEffect(refresh, [refresh, conversations.length]);
    useRealtimeEvent('conversation.created', refresh);
    useRealtimeEvent('conversation.status_changed', refresh);

    return count;
}
