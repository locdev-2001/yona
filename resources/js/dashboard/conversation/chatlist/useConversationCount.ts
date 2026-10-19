import { useCallback, useEffect, useState } from 'react';

import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import { fetchConversationMeta } from '../api';
import { ASSIGNEE_TYPE, SORT_BY_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import type { ConversationStatusFilter } from '../types';

// Số đã đếm theo từng truy vấn: danh sách được dựng lại khi đổi tab thì tab vẫn
// hiện số cũ trong lúc đếm lại, không chớp về 0.
const countsByQuery = new Map<string, number>();

// Số hội thoại của một trạng thái theo bộ lọc kênh/nhãn đang dùng, tự đếm riêng để
// số trên tab không mượn meta của danh sách đang tải khi vừa đổi tab. Đếm lại khi
// danh sách hay trạng thái hội thoại đổi.
export function useConversationCount(status: ConversationStatusFilter): number {
    const { accountId, conversations, listFilters } = useConversation();
    const inboxId = listFilters.inboxIds[0];
    const labelsKey = listFilters.labels.join('\n');
    const queryKey = [accountId, status, inboxId ?? '', labelsKey].join('|');
    const [counted, setCounted] = useState<{ queryKey: string; count: number } | null>(null);

    const refresh = useCallback(() => {
        fetchConversationMeta({
            accountId,
            assigneeType: ASSIGNEE_TYPE.ALL,
            status,
            sortBy: SORT_BY_TYPE.LAST_ACTIVITY_AT_DESC,
            inboxId,
            labels: labelsKey ? labelsKey.split('\n') : [],
        })
            .then(({ meta }) => {
                countsByQuery.set(queryKey, meta.all_count);
                setCounted({ queryKey, count: meta.all_count });
            })
            .catch(() => undefined);
    }, [accountId, status, inboxId, labelsKey, queryKey]);

    useEffect(refresh, [refresh, conversations.length]);
    useRealtimeEvent('conversation.created', refresh);
    useRealtimeEvent('conversation.status_changed', refresh);

    return counted?.queryKey === queryKey ? counted.count : (countsByQuery.get(queryKey) ?? 0);
}
