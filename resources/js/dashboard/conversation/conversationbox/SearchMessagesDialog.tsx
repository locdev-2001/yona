import { forwardRef, useEffect, useState } from 'react';

import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { messageTimestamp } from 'shared/helpers/timeHelper';
import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import type { ConversationMessage } from '../types';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DELAY_MS = 300;

// Tìm tin theo chữ trong cuộc trò chuyện đang mở; bấm một kết quả là cuộn tới tin đó.
const SearchMessagesDialog = forwardRef<DialogHandle>(function SearchMessagesDialog(_props, ref) {
    const { searchConversation, focusMessage } = useConversation();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ConversationMessage[] | null>(null);

    useEffect(() => {
        if (query.trim().length < MIN_QUERY_LENGTH) {
            setResults(null);
            return undefined;
        }
        const timer = window.setTimeout(() => {
            searchConversation(query.trim()).then(setResults, () => setResults([]));
        }, SEARCH_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [query, searchConversation]);

    return (
        <Dialog
            ref={ref}
            title={t('CHAT.SEARCH.TITLE')}
            showConfirmButton={false}
            width="md"
            onClose={() => {
                setQuery('');
                setResults(null);
            }}
        >
            <div className="field-surface flex items-center gap-2 h-11 px-2.5 rounded-lg">
                <span className="i-lucide-search size-[1.125rem] shrink-0 text-n-slate-10" aria-hidden="true" />
                <input
                    type="search"
                    value={query}
                    autoFocus
                    placeholder={t('CHAT.SEARCH.PLACEHOLDER')}
                    aria-label={t('CHAT.SEARCH.TITLE')}
                    className="reset-base flex-1 min-w-0 h-full m-0 p-0 text-[0.9375rem] bg-transparent border-none shadow-none outline-none text-n-slate-12 placeholder:text-n-slate-10"
                    onChange={event => setQuery(event.target.value)}
                />
            </div>
            <ul className="flex flex-col gap-0.5 m-0 mt-2 p-0 list-none max-h-96 overflow-y-auto">
                {results?.length === 0 ? <li className="py-3 text-sm text-n-slate-11">{t('CHAT.SEARCH.EMPTY')}</li> : null}
                {(results ?? []).map(message => (
                    <li key={message.id}>
                        <button
                            type="button"
                            className="flex flex-col w-full min-h-14 px-2 py-2 rounded-lg text-start hover:bg-n-surface-hover active:scale-[0.97]"
                            onClick={() => {
                                (ref as { current: DialogHandle | null } | null)?.current?.close();
                                void focusMessage(message.id);
                            }}
                        >
                            <span className="text-xs text-n-slate-11">
                                {message.sender?.name ?? ''} · {messageTimestamp(message.created_at, 'LLL d, h:mm a')}
                            </span>
                            <span className="text-sm text-n-slate-12 line-clamp-2">{message.content}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </Dialog>
    );
});

export default SearchMessagesDialog;
