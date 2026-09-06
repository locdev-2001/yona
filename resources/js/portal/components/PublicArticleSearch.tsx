import { useEffect, useMemo, useRef, useState } from 'react';

import PublicSearchInput from './PublicSearchInput';
import type { SearchInputHandle } from './PublicSearchInput';
import SearchSuggestions from './SearchSuggestions';
import type { PortalSearchArticle } from '../types';

// Port từ portal/components/PublicArticleSearch.vue.
const SEARCH_DEBOUNCE_MS = 1000;

interface PublicArticleSearchProps {
    size?: 'small' | 'default';
    showKbd?: boolean;
}

export default function PublicArticleSearch({ size = 'default', showKbd = false }: PublicArticleSearchProps) {
    const { portalSlug, localeCode, searchTranslations, theme, isPlainLayoutEnabled } = window.portalConfig;

    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setLoading] = useState(false);
    const [showSearchBox, setShowSearchBox] = useState(false);
    const [searchResults, setSearchResults] = useState<PortalSearchArticle[]>([]);
    const inputRef = useRef<SearchInputHandle>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const containerRef = useRef<HTMLDivElement>(null);

    const normalizedSearchTerm = searchTerm.trim();

    const kbdLabel = useMemo(() => {
        if (!showKbd) return '';

        return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K';
    }, [showKbd]);

    useEffect(() => {
        const onClickAway = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setShowSearchBox(false);
        };

        document.addEventListener('click', onClickAway);

        return () => document.removeEventListener('click', onClickAway);
    }, []);

    useEffect(() => {
        if (!showKbd) return undefined;

        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
                event.preventDefault();
                inputRef.current?.focusInput();
            }
            if (event.key === 'Escape') {
                setShowSearchBox(false);
                inputRef.current?.blurInput();
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [showKbd]);

    const fetchArticlesByQuery = async (query: string) => {
        try {
            setLoading(true);
            setSearchResults([]);
            const response = await fetch(
                `/hc/${encodeURIComponent(portalSlug)}/${encodeURIComponent(localeCode)}/articles?query=${encodeURIComponent(query)}`,
                { headers: { Accept: 'application/json' } },
            );
            const data = await response.json();
            setSearchResults(data.payload ?? []);
        } catch {
            // Bản gốc nuốt lỗi tìm kiếm, chỉ hiện trạng thái rỗng.
        } finally {
            setLoading(false);
        }
    };

    const onUpdateSearchTerm = (value: string) => {
        setSearchTerm(value);
        clearTimeout(timerRef.current);

        if (value.trim() === '') {
            setSearchResults([]);
            setLoading(false);
            setShowSearchBox(false);

            return;
        }

        setShowSearchBox(true);
        setLoading(true);
        timerRef.current = setTimeout(() => fetchArticlesByQuery(value.trim()), SEARCH_DEBOUNCE_MS);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!normalizedSearchTerm) return;

        const searchParams = new URLSearchParams({ query: normalizedSearchTerm });
        if (theme) searchParams.set('theme', theme);
        if (isPlainLayoutEnabled === 'true') searchParams.set('show_plain_layout', 'true');

        window.location.href = `/hc/${portalSlug}/${localeCode}/search?${searchParams.toString()}`;
    };

    return (
        <div ref={containerRef} className="relative w-full max-w-5xl my-4">
            <form onSubmit={handleSubmit}>
                <PublicSearchInput
                    ref={inputRef}
                    searchTerm={searchTerm}
                    searchPlaceholder={searchTranslations.searchPlaceholder}
                    size={size}
                    kbd={kbdLabel}
                    onUpdateSearchTerm={onUpdateSearchTerm}
                    onFocus={() => setShowSearchBox(true)}
                />
                <button type="submit" className="sr-only">
                    {searchTranslations.submit}
                </button>
            </form>
            {normalizedSearchTerm !== '' && showSearchBox ? (
                <div className="absolute w-full top-14" onMouseOver={() => setShowSearchBox(true)}>
                    <SearchSuggestions
                        items={searchResults}
                        isLoading={isLoading}
                        searchTerm={normalizedSearchTerm}
                        emptyPlaceholder={searchTranslations.emptyPlaceholder}
                        loadingPlaceholder={searchTranslations.loadingPlaceholder}
                    />
                </div>
            ) : null}
        </div>
    );
}
