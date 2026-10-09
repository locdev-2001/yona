import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import Button from 'dashboard/components-next/button/Button';
import { t } from '../../../../i18n';
import { searchConversationMessages } from '../../api';
import { useConversation } from '../../ConversationContext';
import {
    SEARCH_DEBOUNCE_MS,
    canStep,
    clearConversationSearch,
    matchCounterLabel,
    paintConversationSearch,
    stepMatchIndex,
} from './conversationSearch';
import type { MatchDirection } from './conversationSearch';

interface SearchResult {
    query: string;
    messageIds: number[];
}

// Thanh tìm trong hội thoại đang mở: gõ là máy chủ trả mọi tin khớp (mới trước),
// Enter/↑ về tin cũ hơn, Shift+Enter/↓ về tin mới hơn, Esc đóng. Nhảy tới tin
// đi qua focusMessage nên tin cũ chưa tải vẫn tới được, kèm ngữ cảnh.
export default function ConversationSearchBar({ onClose }: { onClose: () => void }) {
    const { accountId, conversationId, messages, focusMessage } = useConversation();
    const [query, setQuery] = useState('');
    const [result, setResult] = useState<SearchResult | null>(null);
    const [index, setIndex] = useState(-1);
    const [failed, setFailed] = useState(false);
    const latestRequestRef = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => inputRef.current?.focus(), []);

    useEffect(() => {
        const trimmed = query.trim();
        const requestId = ++latestRequestRef.current;

        if (!trimmed) {
            setResult(null);
            setIndex(-1);
            setFailed(false);
            return undefined;
        }

        const timer = setTimeout(() => {
            searchConversationMessages(accountId, conversationId, trimmed)
                .then(messageIds => {
                    if (requestId !== latestRequestRef.current) return;
                    setFailed(false);
                    setResult({ query: trimmed, messageIds });
                    setIndex(messageIds.length ? 0 : -1);
                    if (messageIds.length) void focusMessage(messageIds[0]);
                })
                .catch(() => {
                    if (requestId === latestRequestRef.current) setFailed(true);
                });
        }, SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [query, accountId, conversationId, focusMessage]);

    useEffect(() => {
        if (result?.messageIds.length) paintConversationSearch(result.messageIds, result.query);
        else clearConversationSearch();
    }, [result, messages]);

    useEffect(() => clearConversationSearch, []);

    const total = result?.messageIds.length ?? 0;

    const step = (direction: MatchDirection) => {
        if (!result || !canStep(index, total, direction)) return;

        const next = stepMatchIndex(index, total, direction);
        setIndex(next);
        void focusMessage(result.messageIds[next]);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Escape' && event.key !== 'Enter') return;

        event.preventDefault();
        event.stopPropagation();

        if (event.key === 'Escape') onClose();
        else step(event.shiftKey ? 'newer' : 'older');
    };

    const statusText = failed
        ? t('CONVERSATION.SEARCH_IN_CONVERSATION.ERROR')
        : result && total === 0
          ? t('CONVERSATION.SEARCH_IN_CONVERSATION.NO_RESULTS')
          : result
            ? matchCounterLabel(index, total)
            : '';

    return (
        <div
            data-testid="conversation-search-bar"
            role="search"
            className="field-surface flex items-center w-full min-w-0 gap-1 h-9 ps-2.5 pe-1 rounded-lg"
            onKeyDown={onKeyDown}
        >
            <span className="flex-shrink-0 i-lucide-search size-4 text-n-slate-10" aria-hidden />
            <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t('CONVERSATION.SEARCH_IN_CONVERSATION.PLACEHOLDER')}
                aria-label={t('CONVERSATION.SEARCH_IN_CONVERSATION.PLACEHOLDER')}
                className="flex-1 min-w-0 !m-0 !p-0 !h-auto !border-0 !bg-transparent !outline-none !shadow-none text-sm text-n-slate-12 placeholder:text-n-slate-10 [&::-webkit-search-cancel-button]:hidden"
            />
            <span data-testid="conversation-search-status" aria-live="polite" className="flex-shrink-0 text-xs tabular-nums text-n-slate-11 whitespace-nowrap">
                {statusText}
            </span>
            <Button
                ghost
                slate
                xs
                icon="i-lucide-chevron-up"
                title={t('CONVERSATION.SEARCH_IN_CONVERSATION.OLDER')}
                disabled={!canStep(index, total, 'older')}
                onClick={() => step('older')}
            />
            <Button
                ghost
                slate
                xs
                icon="i-lucide-chevron-down"
                title={t('CONVERSATION.SEARCH_IN_CONVERSATION.NEWER')}
                disabled={!canStep(index, total, 'newer')}
                onClick={() => step('newer')}
            />
            <Button ghost slate xs icon="i-lucide-x" title={t('CONVERSATION.SEARCH_IN_CONVERSATION.CLOSE')} onClick={onClose} />
        </div>
    );
}
