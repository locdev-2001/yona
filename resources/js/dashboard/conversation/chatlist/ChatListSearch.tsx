import { useEffect, useState } from 'react';

import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';

// Gõ xong mới hỏi máy chủ — mỗi phím không bắn một truy vấn.
const SEARCH_DEBOUNCE_MS = 300;

// Ô tìm ngay trong cột danh sách: lọc tại chỗ danh sách đang xem (hộp thư, tab,
// trạng thái, bộ lọc giữ nguyên). Tìm mọi thứ trong hệ thống là ô ở sidebar.
export default function ChatListSearch() {
    const { searchQuery, setSearchQuery } = useConversation();
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
        <div className="px-3 pb-2">
            <div className="flex items-center gap-2 h-8 px-2.5 rounded-lg outline outline-1 outline-n-weak bg-n-alpha-black2 focus-within:outline-n-brand transition-[outline-color] duration-150">
                <span className="i-lucide-search size-4 shrink-0 text-n-slate-10" aria-hidden="true" />
                <input
                    type="search"
                    value={draft}
                    placeholder={t('CHAT_LIST.SEARCH.INPUT')}
                    aria-label={t('CHAT_LIST.SEARCH.LABEL')}
                    className="reset-base flex-1 min-w-0 h-full m-0 p-0 text-sm bg-transparent border-none shadow-none outline-none text-n-slate-12 placeholder:text-n-slate-10 [&::-webkit-search-cancel-button]:hidden"
                    onChange={event => setDraft(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Escape' && draft) {
                            event.stopPropagation();
                            clearSearch();
                        }
                    }}
                />
                {draft ? (
                    <button
                        type="button"
                        title={t('CHAT_LIST.SEARCH.CLEAR')}
                        aria-label={t('CHAT_LIST.SEARCH.CLEAR')}
                        className="grid place-content-center size-5 shrink-0 rounded text-n-slate-10 hover:text-n-slate-12 hover:bg-n-alpha-2"
                        onClick={clearSearch}
                    >
                        <span className="i-lucide-x size-3.5" aria-hidden="true" />
                    </button>
                ) : null}
            </div>
        </div>
    );
}
