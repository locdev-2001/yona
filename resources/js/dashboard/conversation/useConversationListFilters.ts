import { useCallback, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { filteredListPathname } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../types';
import { ASSIGNEE_TAB_VALUES, ASSIGNEE_TYPE } from './constants';
import { readListFilterQuery, readPersistedListFilters, withListFilterQuery } from './listFilters';
import type { ConversationListFilters, ListFilterQuery, PersistedListFilters } from './listFilters';
import type { AssigneeTab } from './types';

interface PersistedFilterSettings {
    status?: string;
    order_by?: string;
    assignee_type?: string;
}

const LIST_FILTER_VISIT_OPTIONS = { preserveState: true, preserveScroll: true, replace: true } as const;

// Nơi duy nhất đọc/ghi bộ lọc cơ bản của danh sách hội thoại. ConversationProvider
// gọi một lần và phát qua context; thành phần khác đọc `useConversation().listFilters`.
// Kênh + nhãn đọc từ URL của trang, ghi bằng một lượt điều hướng thay query;
// trạng thái + sắp xếp + tab người phụ trách nhớ ở `ui_settings.conversations_filter_by`.
export function useConversationListFilters(updateUISettings: (patch: UISettings) => void) {
    const page = usePage<DashboardPageProps>();
    const accountId = page.props.currentAccount?.id;
    const savedSettings = (page.props.auth?.user?.ui_settings?.conversations_filter_by ?? {}) as PersistedFilterSettings;

    // Lệch có chủ đích: mặc định là "Tất cả", không phải "Của tôi" — chủ shop một
    // người mở inbox lần đầu phải thấy khách đang chờ, không phải một cột trống.
    const [assigneeTab, setAssigneeTabState] = useState<AssigneeTab>(() =>
        ASSIGNEE_TAB_VALUES.includes(savedSettings.assignee_type as AssigneeTab)
            ? (savedSettings.assignee_type as AssigneeTab)
            : ASSIGNEE_TYPE.ALL,
    );
    const [persistedFilters, setPersistedFilters] = useState<PersistedListFilters>(() => readPersistedListFilters(savedSettings));

    const search = new URL(page.url ?? '', 'http://local').search;
    const query = useMemo(() => readListFilterQuery(search), [search]);
    const queryRef = useRef(query);
    queryRef.current = query;

    const filters = useMemo<ConversationListFilters>(() => ({ ...query, ...persistedFilters }), [query, persistedFilters]);

    // Server merge NÔNG cụm này (array_merge ở ProfilesController) nên mỗi lần lưu
    // phải gửi đủ ba khoá, thiếu khoá nào là khoá đó bị xoá.
    const persist = useCallback(
        (next: PersistedListFilters, tab: AssigneeTab) => {
            updateUISettings({
                conversations_filter_by: { status: next.status, order_by: next.sortBy, assignee_type: tab },
            });
        },
        [updateUISettings],
    );

    const setFilters = useCallback(
        (patch: Partial<ConversationListFilters>) => {
            const { inboxIds, labels, ...persistedPatch } = patch;

            if (Object.keys(persistedPatch).length) {
                const next = { ...persistedFilters, ...persistedPatch };
                setPersistedFilters(next);
                persist(next, assigneeTab);
            }

            if (inboxIds !== undefined || labels !== undefined) {
                const nextQuery: ListFilterQuery = { ...queryRef.current, ...(inboxIds && { inboxIds }), ...(labels && { labels }) };
                // window.location giữ `?q=` mà ô tìm ghi thẳng bằng history.replaceState.
                const current = `${window.location.pathname}${window.location.search}`;
                const next = withListFilterQuery(
                    `${filteredListPathname(accountId, window.location.pathname)}${window.location.search}`,
                    nextQuery,
                );
                if (next !== current) router.get(next, {}, LIST_FILTER_VISIT_OPTIONS);
            }
        },
        [accountId, assigneeTab, persist, persistedFilters],
    );

    const setAssigneeTab = useCallback(
        (tab: AssigneeTab) => {
            setAssigneeTabState(tab);
            persist(persistedFilters, tab);
        },
        [persist, persistedFilters],
    );

    return { filters, assigneeTab, setFilters, setAssigneeTab };
}
