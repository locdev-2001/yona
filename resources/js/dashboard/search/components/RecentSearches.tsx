import { useCallback, useEffect, useImperativeHandle, useState } from 'react';
import type { Ref } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/modules/search/components/RecentSearches.vue.
const MAX_RECENT_SEARCHES = 3;
export const RECENT_SEARCHES_STORAGE_KEY = 'recentSearches';

export interface RecentSearchesHandle {
    addRecentSearch: (query: string) => void;
}

interface RecentSearchesProps {
    handleRef?: Ref<RecentSearchesHandle | null>;
    onSelectSearch: (query: string) => void;
    onClearAll: () => void;
}

function readStored(): string[] {
    try {
        const stored = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY) ?? 'null');

        return Array.isArray(stored) ? (stored as string[]) : [];
    } catch {
        return [];
    }
}

export default function RecentSearches({ handleRef, onSelectSearch, onClearAll }: RecentSearchesProps) {
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    useEffect(() => {
        setRecentSearches(readStored());
    }, []);

    const addRecentSearch = useCallback((query: string) => {
        if (!query || query.trim().length < 2) return;

        const trimmedQuery = query.trim();
        setRecentSearches(current => {
            const next = [
                trimmedQuery,
                ...current.filter(search => search.toLowerCase() !== trimmedQuery.toLowerCase()),
            ].slice(0, MAX_RECENT_SEARCHES);
            window.localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(next));
            window.localStorage.setItem(`${RECENT_SEARCHES_STORAGE_KEY}:ts`, Date.now().toString());

            return next;
        });
    }, []);

    useImperativeHandle(handleRef, () => ({ addRecentSearch }), [addRecentSearch]);

    if (!recentSearches.length) return null;

    return (
        <div className="px-4 pb-4 w-full pt-2">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <Icon icon="i-lucide-rotate-ccw" className="text-n-slate-10 size-4" />
                    <h3 className="text-base font-medium text-n-slate-10">{t('SEARCH.RECENT_SEARCHES')}</h3>
                </div>
                <Button
                    type="button"
                    xs
                    slate
                    ghost
                    className="!text-n-slate-10 hover:!text-n-slate-12"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => {
                        setRecentSearches([]);
                        window.localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
                        window.localStorage.removeItem(`${RECENT_SEARCHES_STORAGE_KEY}:ts`);
                        onClearAll();
                    }}
                >
                    {t('SEARCH.CLEAR_ALL')}
                </Button>
            </div>

            <div className="flex flex-col gap-4 items-start">
                {recentSearches.map((search, index) => (
                    <button
                        key={search}
                        type="button"
                        className="w-full flex items-center gap-2.5 text-left text-base text-n-slate-12 rounded-lg transition-all duration-150 group p-0"
                        onMouseDown={event => event.preventDefault()}
                        onClick={() => onSelectSearch(search)}
                    >
                        <Icon
                            icon="i-lucide-search"
                            className="text-n-slate-10 group-hover:text-n-slate-11 transition-colors duration-150 size-4"
                        />
                        <span className="flex-1 truncate">{search}</span>
                        <span className="text-xs text-n-slate-8 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                            {index === 0 ? t('SEARCH.MOST_RECENT') : ''}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
