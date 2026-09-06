import { useRef } from 'react';

import SearchFilters from './SearchFilters';
import SearchInput, { type SearchInputHandle } from './SearchInput';
import type { SearchFilterState } from '../types';

// Port từ dashboard/modules/search/components/SearchHeader.vue — Policy của bản
// gốc thay bằng cờ tính năng advanced_search (Yona không có installation type).
interface SearchHeaderProps {
    query: string;
    filters: SearchFilterState;
    accountId: number;
    showFilters: boolean;
    onQueryChange: (value: string) => void;
    onSearch: (query: string) => void;
    onFilterChange: (filters: SearchFilterState) => void;
}

export default function SearchHeader({
    query,
    filters,
    accountId,
    showFilters,
    onQueryChange,
    onSearch,
    onFilterChange,
}: SearchHeaderProps) {
    const searchInputRef = useRef<SearchInputHandle | null>(null);

    const runSearch = (nextQuery: string) => {
        if (nextQuery?.trim()) {
            searchInputRef.current?.addToRecentSearches(nextQuery.trim());
        }
        onSearch(nextQuery);
    };

    return (
        <div className="flex flex-col gap-2">
            <SearchInput
                handleRef={searchInputRef}
                value={query}
                onChange={onQueryChange}
                onSearch={runSearch}
                onSelectRecentSearch={runSearch}
            >
                {showFilters ? (
                    <div className="w-full">
                        <SearchFilters filters={filters} accountId={accountId} onUpdateFilters={onFilterChange} />
                    </div>
                ) : null}
            </SearchInput>
        </div>
    );
}
