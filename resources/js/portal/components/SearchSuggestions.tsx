import { useEffect, useRef, useState } from 'react';

import { escapeHtml } from 'shared/helpers/escapeHtml';
import { getPlainText } from 'shared/helpers/MessageFormatter';
import type { PortalSearchArticle } from '../types';

// Port từ portal/components/SearchSuggestions.vue.
const HIGHLIGHT_CLASS = 'bg-n-portal-soft text-n-portal font-semibold rounded-sm px-1';
const ITEM_HEIGHT = 102;

interface SearchSuggestionsProps {
    items: PortalSearchArticle[];
    isLoading: boolean;
    searchTerm: string;
    emptyPlaceholder: string;
    loadingPlaceholder: string;
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// highlightContent của useMessageFormatter: bọc mọi lần khớp trong <span>. Tách
// đoạn khớp trên chữ gốc rồi mới mã hoá từng đoạn, để từ khoá không cắt ngang
// một thực thể HTML (`&amp;`, `&#39;`).
function highlight(content: string, searchTerm: string): string {
    const text = content ?? '';
    if (!searchTerm) return escapeHtml(text);

    return text
        .split(new RegExp(`(${escapeRegExp(searchTerm)})`, 'i'))
        .map((part, index) => (index % 2 === 1 ? `<span class="${HIGHLIGHT_CLASS}">${escapeHtml(part)}</span>` : escapeHtml(part)))
        .join('');
}

export default function SearchSuggestions({
    items,
    isLoading,
    searchTerm,
    emptyPlaceholder,
    loadingPlaceholder,
}: SearchSuggestionsProps) {
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => setSelectedIndex(-1), [items]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!items.length) return;
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setSelectedIndex(current => (current + 1) % items.length);
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                setSelectedIndex(current => (current <= 0 ? items.length - 1 : current - 1));
            } else if (event.key === 'Enter' && selectedIndex >= 0) {
                window.location.href = items[selectedIndex].link;
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [items, selectedIndex]);

    useEffect(() => {
        if (listRef.current && selectedIndex >= 0) listRef.current.scrollTop = ITEM_HEIGHT * selectedIndex;
    }, [selectedIndex]);

    const showEmptyResults = !items.length && !isLoading;
    const shouldShowResults = items.length > 0 && !isLoading;

    return (
        <div
            ref={listRef}
            className="mt-2 overflow-y-auto bg-white border border-solid border-n-weak rounded-xl shadow-2xl max-h-96 p-2"
        >
            {isLoading ? <div className="px-3 py-6 text-sm text-n-slate-11 text-center">{loadingPlaceholder}</div> : null}
            {shouldShowResults ? (
                <ul className="flex flex-col gap-0.5" role="listbox">
                    {items.map((article, index) => (
                        <li
                            key={article.id}
                            id={String(article.id)}
                            className={`rounded-md cursor-pointer select-none group transition-colors hover:bg-n-alpha-2 ${index === selectedIndex ? 'bg-n-portal-soft' : ''}`}
                            role="option"
                            aria-selected={index === selectedIndex}
                            tabIndex={-1}
                        >
                            <a className="flex items-start gap-3 px-3 py-2.5 overflow-hidden" href={article.link}>
                                <span
                                    className="i-lucide-file-text size-4 mt-0.5 flex-shrink-0 text-n-slate-10 group-hover:text-n-slate-11"
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 flex-1 flex flex-col gap-1">
                                    <span
                                        className="block text-base font-520 text-n-slate-12 truncate"
                                        dangerouslySetInnerHTML={{ __html: highlight(getPlainText(article.title), searchTerm) }}
                                    />
                                    <span
                                        className="block text-sm text-n-slate-11 line-clamp-1"
                                        dangerouslySetInnerHTML={{ __html: highlight(article.content, searchTerm) }}
                                    />
                                </span>
                            </a>
                        </li>
                    ))}
                </ul>
            ) : null}

            {showEmptyResults ? <div className="px-3 py-6 text-sm text-n-slate-11 text-center">{emptyPlaceholder}</div> : null}
        </div>
    );
}
