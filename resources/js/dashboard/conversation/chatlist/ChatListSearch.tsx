import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import ListHeaderButton from './ListHeaderButton';
import NewChatDialog from './NewChatDialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';

// Gõ xong mới hỏi máy chủ — mỗi phím không bắn một truy vấn.
const SEARCH_DEBOUNCE_MS = 300;

// Ô tìm ngay trong cột danh sách: lọc tại chỗ các cuộc trò chuyện của tab đang xem.
// Nút soạn tin mở hộp tìm người theo @username để bắt đầu trò chuyện mới.
export default function ChatListSearch({ actions, trailing }: { actions?: ReactNode; trailing?: ReactNode }) {
    const { searchQuery, setSearchQuery } = useConversation();
    const [draft, setDraft] = useState(searchQuery);
    const newChatDialogRef = useRef<DialogHandle>(null);

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
            <div className="field-surface flex flex-1 min-w-0 items-center gap-2 h-9 max-md:h-11 px-2.5 rounded-lg">
                <span className="i-lucide-search size-[1.125rem] shrink-0 text-n-slate-10" aria-hidden="true" />
                <input
                    type="search"
                    value={draft}
                    placeholder={t('CHAT_LIST.SEARCH.INPUT')}
                    aria-label={t('CHAT_LIST.SEARCH.LABEL')}
                    className="reset-base flex-1 min-w-0 h-full m-0 p-0 text-[0.9375rem] bg-transparent border-none shadow-none outline-none text-n-slate-12 placeholder:text-n-slate-10 [&::-webkit-search-cancel-button]:hidden"
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
                        className="grid place-content-center size-5 shrink-0 rounded text-n-slate-10 hover:text-n-slate-12 hover:bg-n-surface-hover"
                        onClick={clearSearch}
                    >
                        <span className="i-lucide-x size-3.5" aria-hidden="true" />
                    </button>
                ) : null}
            </div>
            {actions}
            <ListHeaderButton
                icon="i-lucide-square-pen"
                label={t('CHAT.NEW.TITLE')}
                onClick={() => newChatDialogRef.current?.open()}
            />
            {trailing}
            <NewChatDialog ref={newChatDialogRef} />
        </div>
    );
}
