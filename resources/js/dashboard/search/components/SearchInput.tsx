import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { ReactNode, Ref } from 'react';

import { t } from '../../../i18n';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import RecentSearches, { type RecentSearchesHandle } from './RecentSearches';

// Port từ dashboard/modules/search/components/SearchInput.vue.
const DEBOUNCE_DELAY = 500;

export interface SearchInputHandle {
    addToRecentSearches: (query: string) => void;
}

interface SearchInputProps {
    value: string;
    handleRef?: Ref<SearchInputHandle | null>;
    children?: ReactNode;
    onChange: (value: string) => void;
    onSearch: (query: string) => void;
    onSelectRecentSearch: (query: string) => void;
}

export default function SearchInput({
    value,
    handleRef,
    children,
    onChange,
    onSearch,
    onSelectRecentSearch,
}: SearchInputProps) {
    const [isInputFocused, setInputFocused] = useState(false);
    const [showRecentSearches, setShowRecentSearches] = useState(false);
    const searchInput = useRef<HTMLInputElement>(null);
    const recentSearchesRef = useRef<RecentSearchesHandle | null>(null);
    const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
    const onSearchRef = useRef(onSearch);
    onSearchRef.current = onSearch;

    useImperativeHandle(
        handleRef,
        () => ({ addToRecentSearches: query => recentSearchesRef.current?.addRecentSearch(query) }),
        [],
    );

    useEffect(() => {
        searchInput.current?.focus();

        const handler = (event: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName;
            if (event.key === '/' && activeTag !== 'INPUT') {
                event.preventDefault();
                searchInput.current?.focus();
            } else if (event.key === 'Escape' && activeTag === 'INPUT') {
                event.preventDefault();
                searchInput.current?.blur();
            }
        };

        document.addEventListener('keydown', handler);

        return () => {
            document.removeEventListener('keydown', handler);
            clearTimeout(debounceTimer.current);
        };
    }, []);

    const onInput = (nextValue: string) => {
        onChange(nextValue);
        clearTimeout(debounceTimer.current);
        // Chỉ tìm khi đủ 2 ký tự, trừ khi gõ toàn số (id hội thoại).
        debounceTimer.current = setTimeout(
            () => onSearchRef.current(nextValue.length > 1 || /^[0-9]+$/.test(nextValue) ? nextValue : ''),
            DEBOUNCE_DELAY,
        );

        if (nextValue.trim()) {
            setShowRecentSearches(false);
        } else if (isInputFocused) {
            setShowRecentSearches(true);
        }
    };

    return (
        <div
            className={`rounded-xl transition-[border-bottom] duration-[0.2s] ease-[ease-in-out] relative flex items-start flex-col border border-solid bg-n-solid-1 divide-y divide-n-strong ${
                isInputFocused ? 'border-n-brand' : 'border-n-strong'
            }`}
        >
            <div className="flex items-center w-full h-[3.25rem] px-4 gap-2">
                <div className="flex items-center">
                    <FluentIcon
                        icon="search"
                        className={`icon ${isInputFocused ? 'text-n-blue-11' : 'text-n-slate-10'}`}
                    />
                </div>
                <input
                    ref={searchInput}
                    value={value}
                    type="search"
                    className="reset-base outline-none w-full m-0 bg-transparent border-transparent shadow-none text-n-slate-12 dark:text-n-slate-12 active:border-transparent active:shadow-none hover:border-transparent hover:shadow-none focus:border-transparent focus:shadow-none placeholder:text-n-slate-10 text-base"
                    placeholder={t('SEARCH.INPUT_PLACEHOLDER')}
                    onFocus={() => {
                        setInputFocused(true);
                        if (!value.trim()) setShowRecentSearches(true);
                    }}
                    onBlur={() => {
                        setInputFocused(false);
                        setShowRecentSearches(false);
                    }}
                    onChange={event => onInput(event.target.value)}
                />
                <span className="text-sm text-n-slate-10 flex-shrink-0">{t('SEARCH.PLACEHOLDER_KEYBINDING')}</span>
            </div>

            {children}

            <div
                className={`transition-all duration-200 ease-out grid overflow-hidden w-full !border-t-0 ${
                    showRecentSearches ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden w-full">
                    <RecentSearches
                        handleRef={recentSearchesRef}
                        onSelectSearch={query => {
                            onChange(query);
                            onSelectRecentSearch(query);
                            setShowRecentSearches(false);
                            searchInput.current?.focus();
                        }}
                        onClearAll={() => setShowRecentSearches(false)}
                    />
                </div>
            </div>
        </div>
    );
}
