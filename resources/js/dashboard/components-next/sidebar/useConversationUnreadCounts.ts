import { useCallback, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { fetchConversationUnreadCounts } from 'dashboard/conversation/api';
import { useRealtimeEvent } from 'dashboard/realtime/hooks';
import type { DashboardPageProps } from '../../types';

// Port từ store/modules/conversationUnreadCounts.js + nhánh
// fetchConversationUnreadCounts trong sidebar/Sidebar.vue.
// Cờ `conversation_unread_counts` (FEATURE_FLAGS.CONVERSATION_UNREAD_COUNTS) mặc
// định TẮT ở cả oracle lẫn yona → không gọi API, không hiện badge nào.

export interface SidebarUnreadCounts {
    allCount: number;
    inboxes: Record<string, number>;
    labels: Record<string, number>;
    teams: Record<string, number>;
}

export const EMPTY_UNREAD_COUNTS: SidebarUnreadCounts = {
    allCount: 0,
    inboxes: {},
    labels: {},
    teams: {},
};

// normalizeCount/normalizeCounts gốc: bỏ khóa có số ≤ 0 hoặc không phải số.
export function normalizeUnreadCount(count: unknown): number {
    const parsed = Number(count);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function normalizeUnreadCounts(counts: Record<string, unknown> | undefined): Record<string, number> {
    return Object.entries(counts ?? {}).reduce<Record<string, number>>((result, [id, count]) => {
        const parsed = normalizeUnreadCount(count);
        if (parsed > 0) result[String(id)] = parsed;
        return result;
    }, {});
}

export function useConversationUnreadCounts(): SidebarUnreadCounts {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const isEnabled = Boolean(currentAccount.features?.conversation_unread_counts);
    const [counts, setCounts] = useState<SidebarUnreadCounts>(EMPTY_UNREAD_COUNTS);

    const refresh = useCallback(() => {
        if (!isEnabled) {
            setCounts(EMPTY_UNREAD_COUNTS);
            return;
        }
        fetchConversationUnreadCounts(accountId).then(
            ({ payload }) =>
                setCounts({
                    allCount: normalizeUnreadCount(payload?.all_count),
                    inboxes: normalizeUnreadCounts(payload?.inboxes),
                    labels: normalizeUnreadCounts(payload?.labels),
                    teams: normalizeUnreadCounts(payload?.teams),
                }),
            // Gốc nuốt lỗi để sidebar vẫn render khi cờ tắt (403).
            () => undefined,
        );
    }, [accountId, isEnabled]);

    useEffect(refresh, [refresh]);
    // Payload rỗng như gốc: server chỉ báo "có đổi", client hỏi lại bộ đếm.
    useRealtimeEvent('conversation.unread_count_changed', refresh);

    return counts;
}
