import { useCallback, useEffect, useRef, useState } from 'react';

import { buildConversationFilterPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import { useAlert } from 'dashboard/composables/useAlert';
import { t } from '../../../i18n';
import { searchConversationList, tabCountsOf } from '../api';
import type { MatchedConversation } from '../api';
import { useConversation } from '../ConversationContext';
import type { Conversation, ConversationListMeta } from '../types';
import { appendSearchPage } from './listSearch';

export interface ListSearchResults {
    contacts: Conversation[];
    conversations: MatchedConversation[];
    // Số đếm tab của từ khoá; null khi chưa có kết quả.
    meta: ConversationListMeta | null;
    loading: boolean;
    hasMore: boolean;
    loadMore: () => void;
}

const EMPTY_RESULTS = { contacts: [], conversations: [], meta: null, hasMore: false };

// Kết quả ô tìm chia mục (Liên hệ / Hội thoại) trong đúng phạm vi danh sách đang
// xem: đổi từ khoá, tab, trạng thái, hộp thư hay bộ lọc là tìm lại từ trang 1;
// mục Hội thoại cuộn tiếp theo trang. Không có từ khoá thì rỗng, không gọi máy chủ.
export function useListSearchResults(): ListSearchResults {
    const { listQuery, appliedFilters, searchQuery } = useConversation();
    const [results, setResults] = useState<Omit<ListSearchResults, 'loading' | 'loadMore'>>(EMPTY_RESULTS);
    const [loading, setLoading] = useState(false);
    const pageRef = useRef(1);
    const requestVersionRef = useRef(0);

    const fetchPage = useCallback(
        async (page: number) => {
            const requestVersion = requestVersionRef.current + 1;
            requestVersionRef.current = requestVersion;

            if (!searchQuery) {
                setResults(EMPTY_RESULTS);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const response = await searchConversationList({
                    ...listQuery,
                    page,
                    searchQuery,
                    filterPayload: appliedFilters ? buildConversationFilterPayload(appliedFilters) : undefined,
                });
                if (requestVersionRef.current !== requestVersion) return;

                const { contacts, conversations, meta } = response.data;
                pageRef.current = page;
                setResults(previous => ({
                    contacts: page === 1 ? contacts : previous.contacts,
                    conversations: page === 1 ? conversations : appendSearchPage(previous.conversations, conversations),
                    meta: tabCountsOf(meta) ?? previous.meta,
                    hasMore: meta.has_more,
                }));
            } catch {
                if (requestVersionRef.current !== requestVersion) return;
                useAlert(t('CHAT_LIST.FETCH_ERROR'));
            } finally {
                if (requestVersionRef.current === requestVersion) setLoading(false);
            }
        },
        [listQuery, appliedFilters, searchQuery],
    );

    useEffect(() => {
        void fetchPage(1);
    }, [fetchPage]);

    const loadMore = useCallback(() => {
        if (loading || !results.hasMore) return;
        void fetchPage(pageRef.current + 1);
    }, [loading, results.hasMore, fetchPage]);

    return { ...results, loading, loadMore };
}
