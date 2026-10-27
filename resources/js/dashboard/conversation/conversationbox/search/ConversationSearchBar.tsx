import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import Button from 'dashboard/components-next/button/Button';
import SearchField from 'dashboard/components-next/search-field/SearchField';
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
    const [isSearching, setSearching] = useState(false);
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
            setSearching(false);
            return undefined;
        }

        setSearching(true);
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
                })
                .finally(() => {
                    if (requestId === latestRequestRef.current) setSearching(false);
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

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Escape' && event.key !== 'Enter') return;

        event.preventDefault();
        event.stopPropagation();

        if (event.key === 'Escape') onClose();
        else step(event.shiftKey ? 'newer' : 'older');
    };

    const statusText = isSearching
        ? t('CONVERSATION.SEARCH_IN_CONVERSATION.SEARCHING')
        : failed
        ? t('CONVERSATION.SEARCH_IN_CONVERSATION.ERROR')
        : result && total === 0
          ? t('CONVERSATION.SEARCH_IN_CONVERSATION.NO_RESULTS')
          : result
            ? matchCounterLabel(index, total)
            : '';

    return (
        <div data-testid="conversation-search-bar" role="search" className="w-full min-w-0">
            <SearchField
                inputRef={inputRef}
                value={query}
                placeholder={t('CONVERSATION.SEARCH_IN_CONVERSATION.PLACEHOLDER')}
                className="pe-1"
                clearable={false}
                onChange={setQuery}
                onKeyDown={onKeyDown}
                trailing={
                    <>
                        <span
                            data-testid="conversation-search-status"
                            aria-live="polite"
                            className="flex-shrink-0 text-xs tabular-nums text-n-slate-11 whitespace-nowrap"
                        >
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
                    </>
                }
            />
        </div>
    );
}
