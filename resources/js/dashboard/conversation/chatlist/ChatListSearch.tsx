import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { router } from '@inertiajs/react';

import { composeConversationUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import ListHeaderButton from './ListHeaderButton';
import SearchField from 'dashboard/components-next/search-field/SearchField';

// Gõ xong mới hỏi máy chủ — mỗi phím không bắn một truy vấn.
const SEARCH_DEBOUNCE_MS = 300;

// Ô tìm ngay trong cột danh sách: lọc tại chỗ danh sách đang xem (hộp thư, tab,
// trạng thái, bộ lọc giữ nguyên). Tìm mọi thứ trong hệ thống là ô ở sidebar.
// `actions` là các nút của cột (Lọc, Chọn nhiều) chen giữa ô tìm và nút Soạn tin.
export default function ChatListSearch({ actions, trailing }: { actions?: ReactNode; trailing?: ReactNode }) {
    const { accountId, listFilters, teamId, searchQuery, setSearchQuery, isComposing } = useConversation();
    const [draft, setDraft] = useState(searchQuery);

    // Từ khoá đổi từ ngoài (điều hướng) thì ô theo; khoảng trắng đang gõ dở thì giữ.
    useEffect(() => {
        setDraft(current => (current.trim() === searchQuery ? current : searchQuery));
    }, [searchQuery]);

    useEffect(() => {
        if (draft.trim() === searchQuery) return undefined;
        const timer = window.setTimeout(() => setSearchQuery(draft), SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [draft, searchQuery, setSearchQuery]);

    const clearSearch = () => {
        setDraft('');
        setSearchQuery('');
    };

    return (
        <div className="flex items-center gap-1.5 min-w-0">
            <SearchField
                value={draft}
                placeholder={t('CHAT_LIST.SEARCH.INPUT')}
                ariaLabel={t('CHAT_LIST.SEARCH.LABEL')}
                className="flex-1"
                onChange={value => (value ? setDraft(value) : clearSearch())}
            />
            {actions}
            <ListHeaderButton
                variant="field"
                icon="i-lucide-square-pen"
                label={t('CHAT_LIST.SEARCH.COMPOSE')}
                isActive={isComposing}
                aria-current={isComposing ? 'page' : undefined}
                onClick={() =>
                    router.visit(composeConversationUrl({ accountId, filters: listFilters, teamId }), {
                        preserveState: true,
                        preserveScroll: true,
                    })
                }
            />
            {trailing}
        </div>
    );
}
