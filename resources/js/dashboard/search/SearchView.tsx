import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import Dashboard from '../Dashboard';
import Button from 'dashboard/components-next/button/Button';
import SearchHeader from './components/SearchHeader';
import SearchTabs, { type SearchTabConfig } from './components/SearchTabs';
import SearchResultArticlesList from './components/SearchResultArticlesList';
import SearchResultContactsList from './components/SearchResultContactsList';
import SearchResultConversationsList from './components/SearchResultConversationsList';
import SearchResultFilesList from './components/SearchResultFilesList';
import SearchResultMessagesList from './components/SearchResultMessagesList';
import { generateURLParams, parseURLParams } from './helpers/searchHelper';
import {
    clearSearchResults,
    fullSearch,
    searchByKind,
    searchFlagsOf,
    searchRecordsOf,
    SEARCH_RECORD_KINDS,
    useSearchState,
    type SearchRecordKind,
} from './store';
import type { SearchFilterState, SearchTab } from './types';
import type { DashboardPageProps } from '../types';
import { ICONS } from 'dashboard/icons';
import { isProductFeatureVisible } from 'shared/helpers/productVisibility';

// Port từ dashboard/modules/search/components/SearchView.vue.
// Khác biệt cố ý: Policy/permission vai trò tuỳ biến là EE — CE mọi vai trò
// thấy đủ mục, nên chỉ còn cờ tính năng help_center (tab Articles) và
// advanced_search (bộ lọc) quyết định hiển thị.
const ALL_TAB: SearchTab = 'all';
const PREVIEW_COUNT = 5;

const firstPages = () =>
    Object.fromEntries(SEARCH_RECORD_KINDS.map(kind => [kind, 1])) as Record<SearchRecordKind, number>;

export default function SearchView({ tab }: { tab?: string | null }) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const isAdvancedSearchEnabled = Boolean(currentAccount.features?.advanced_search);
    const isHelpCenterEnabled = Boolean(currentAccount.features?.help_center) && isProductFeatureVisible('helpCenter');

    const [selectedTab, setSelectedTab] = useState<SearchTab>(tab === 'articles' && !isHelpCenterEnabled ? ALL_TAB : (tab as SearchTab) || ALL_TAB);
    const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
    const [filters, setFilters] = useState<SearchFilterState>(() =>
        parseURLParams(
            Object.fromEntries(new URLSearchParams(window.location.search).entries()),
            isAdvancedSearchEnabled,
        ),
    );
    const pages = useRef(firstPages());

    const searchState = useSearchState();
    const { contactRecords, conversationRecords, messageRecords, fileRecords, articleRecords, uiFlags } = searchState;

    const isSelectedTabAll = selectedTab === ALL_TAB;
    const selectedKind = isSelectedTabAll ? null : (selectedTab as SearchRecordKind);
    const sliceIfAllTab = <T,>(items: T[]) => (isSelectedTabAll ? items.slice(0, PREVIEW_COUNT) : items);
    const isKindVisible = (kind: SearchRecordKind) => kind !== 'articles' || isHelpCenterEnabled;

    const contacts = sliceIfAllTab(contactRecords);
    const conversations = sliceIfAllTab(conversationRecords);
    const messages = sliceIfAllTab(messageRecords);
    const files = sliceIfAllTab(fileRecords);
    const articles = sliceIfAllTab(articleRecords);

    const tabs: SearchTabConfig[] = useMemo(
        () => [
            { key: ALL_TAB, name: t('SEARCH.TABS.ALL'), count: null, showBadge: false },
            ...SEARCH_RECORD_KINDS.filter(isKindVisible).map(kind => ({
                key: kind,
                name: t(`SEARCH.TABS.${kind.toUpperCase()}`),
                count: searchRecordsOf(searchState, kind).length,
                showBadge: true,
            })),
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isHelpCenterEnabled, searchState],
    );

    const totalSearchResultsCount = SEARCH_RECORD_KINDS.filter(isKindVisible).reduce(
        (total, kind) => total + sliceIfAllTab(searchRecordsOf(searchState, kind)).length,
        0,
    );

    const activeTabIndex = Math.max(
        0,
        tabs.findIndex(item => item.key === selectedTab),
    );

    const isFetchingAny =
        uiFlags.isFetching || SEARCH_RECORD_KINDS.some(kind => searchFlagsOf(searchState, kind).isFetching);

    const showEmptySearchResults =
        totalSearchResultsCount === 0 && uiFlags.isSearchCompleted && isSelectedTabAll && !isFetchingAny && !!query;

    const showResultsSection =
        (uiFlags.isSearchCompleted && totalSearchResultsCount !== 0) ||
        isFetchingAny ||
        (!isSelectedTabAll && !!query && !isFetchingAny);

    const showLoadMore =
        !!query &&
        !isFetchingAny &&
        selectedKind !== null &&
        searchRecordsOf(searchState, selectedKind).length > 0 &&
        Boolean(searchFlagsOf(searchState, selectedKind).hasMore);

    const showViewMore = (kind: SearchRecordKind) =>
        searchRecordsOf(searchState, kind).length > PREVIEW_COUNT && isSelectedTabAll;

    // Chỉ đính kèm bộ lọc khi advanced_search bật. Luôn gửi đủ bộ lọc đang chọn;
    // api.ts quyết định loại kết quả nào dùng bộ lọc theo tin.
    const buildSearchPayload = useCallback(
        (base: { q: string; page: number }, activeFilters: SearchFilterState = filters) => {
            if (!isAdvancedSearchEnabled) return base;

            return {
                ...base,
                ...(activeFilters.dateRange.from ? { since: activeFilters.dateRange.from } : {}),
                ...(activeFilters.dateRange.to ? { until: activeFilters.dateRange.to } : {}),
                ...(activeFilters.from ? { from: activeFilters.from } : {}),
                ...(activeFilters.in ? { inboxId: activeFilters.in } : {}),
            };
        },
        [filters, isAdvancedSearchEnabled],
    );

    const updateURL = useCallback(
        (nextQuery: string, nextTab: SearchTab, nextFilters: SearchFilterState) => {
            const params = new URLSearchParams(
                Object.entries({
                    ...(nextQuery.trim() ? { q: nextQuery.trim() } : {}),
                    ...generateURLParams(nextFilters, isAdvancedSearchEnabled),
                }).map(([key, value]) => [key, String(value)]),
            );
            const path = `/app/accounts/${accountId}/search${nextTab !== ALL_TAB ? `/${nextTab}` : ''}`;
            const search = params.toString();
            window.history.replaceState(window.history.state, '', search ? `${path}?${search}` : path);
        },
        [accountId, isAdvancedSearchEnabled],
    );

    const runSearch = useCallback(
        (nextQuery: string, nextFilters: SearchFilterState = filters) => {
            setQuery(nextQuery);
            pages.current = firstPages();
            clearSearchResults();
            updateURL(nextQuery, selectedTab, nextFilters);
            if (!nextQuery) return;

            void fullSearch(accountId, buildSearchPayload({ q: nextQuery, page: 1 }, nextFilters));
        },
        [accountId, buildSearchPayload, filters, selectedTab, updateURL],
    );

    // onMounted của bản gốc + khôi phục truy vấn từ URL.
    const initialQuery = useRef(query);
    useEffect(() => {
        clearSearchResults();
        if (initialQuery.current) runSearch(initialQuery.current);

        return () => clearSearchResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadMore = async () => {
        if (uiFlags.isFetching || selectedKind === null) return;

        const kind = selectedKind;
        pages.current[kind] += 1;
        const success = await searchByKind(kind, accountId, buildSearchPayload({ q: query, page: pages.current[kind] }));
        // Lỗi thì lùi lại để lần thử sau lấy đúng trang chưa nạp được.
        if (!success) pages.current[kind] -= 1;
    };

    const onTabChange = (nextTab: SearchTab) => {
        setSelectedTab(nextTab);
        updateURL(query, nextTab, filters);
    };

    const viewMoreButton = (kind: SearchRecordKind) =>
        showViewMore(kind) ? (
            <Button
                label={t('SEARCH.VIEW_MORE')}
                icon="i-lucide-eye"
                slate
                sm
                outline
                onClick={() => onTabChange(kind)}
            />
        ) : null;

    const sectionClass = isSelectedTabAll ? 'mt-4' : 'mt-0.5';
    const showKind = (kind: SearchRecordKind) => selectedTab === kind || isSelectedTabAll;

    return (
        <Dashboard>
            <div className="flex flex-col w-full h-full bg-n-surface-1">
                <div className="flex w-full p-4">
                    <Button
                        label={t('GENERAL_SETTINGS.BACK')}
                        icon="i-lucide-chevron-left"
                        faded
                        sm
                        onClick={() => {
                            if (window.history.length > 2) {
                                window.history.back();
                            } else {
                                router.visit(`/app/accounts/${accountId}/dashboard`);
                            }
                            clearSearchResults();
                        }}
                    />
                </div>
                <section className="flex flex-col flex-grow w-full h-full overflow-hidden">
                    <div className="w-full max-w-5xl mx-auto z-30">
                        <div className="flex flex-col w-full px-4">
                            <SearchHeader
                                query={query}
                                filters={filters}
                                accountId={accountId}
                                showFilters={isAdvancedSearchEnabled}
                                onQueryChange={setQuery}
                                onSearch={runSearch}
                                onFilterChange={nextFilters => {
                                    setFilters(nextFilters);
                                    runSearch(query, nextFilters);
                                }}
                            />
                            {query ? (
                                <SearchTabs tabs={tabs} selectedTab={activeTabIndex} onTabChange={onTabChange} />
                            ) : null}
                        </div>
                    </div>
                    <div className="flex-grow w-full h-full overflow-y-auto">
                        <div className="w-full max-w-5xl mx-auto px-4 pb-6">
                            {showResultsSection ? (
                                <div>
                                    <div className="flex flex-col justify-center">
                                        {showKind('conversations') ? (
                                            <SearchResultConversationsList
                                                isFetching={uiFlags.conversation.isFetching}
                                                conversations={conversations}
                                                accountId={accountId}
                                                query={query}
                                                showTitle={isSelectedTabAll}
                                                className="mt-0.5"
                                            />
                                        ) : null}
                                        {viewMoreButton('conversations')}
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        {showKind('messages') ? (
                                            <SearchResultMessagesList
                                                isFetching={uiFlags.message.isFetching}
                                                messages={messages}
                                                accountId={accountId}
                                                query={query}
                                                showTitle={isSelectedTabAll}
                                                className={sectionClass}
                                            />
                                        ) : null}
                                        {viewMoreButton('messages')}
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        {showKind('contacts') ? (
                                            <SearchResultContactsList
                                                isFetching={uiFlags.contact.isFetching}
                                                contacts={contacts}
                                                accountId={accountId}
                                                query={query}
                                                showTitle={isSelectedTabAll}
                                                className={sectionClass}
                                            />
                                        ) : null}
                                        {viewMoreButton('contacts')}
                                    </div>

                                    <div className="flex flex-col justify-center">
                                        {showKind('files') ? (
                                            <SearchResultFilesList
                                                isFetching={uiFlags.file.isFetching}
                                                files={files}
                                                accountId={accountId}
                                                query={query}
                                                showTitle={isSelectedTabAll}
                                                className={sectionClass}
                                            />
                                        ) : null}
                                        {viewMoreButton('files')}
                                    </div>

                                    {isHelpCenterEnabled ? (
                                        <div className="flex flex-col justify-center">
                                            {showKind('articles') ? (
                                                <SearchResultArticlesList
                                                    isFetching={uiFlags.article.isFetching}
                                                    articles={articles}
                                                    accountId={accountId}
                                                    query={query}
                                                    showTitle={isSelectedTabAll}
                                                    className={sectionClass}
                                                />
                                            ) : null}
                                            {viewMoreButton('articles')}
                                        </div>
                                    ) : null}

                                    {showLoadMore ? (
                                        <div className="flex justify-center mt-3 mb-6">
                                            <Button
                                                label={t('SEARCH.LOAD_MORE')}
                                                icon="i-lucide-cloud-download"
                                                slate
                                                sm
                                                faded
                                                onClick={loadMore}
                                            />
                                        </div>
                                    ) : null}
                                </div>
                            ) : showEmptySearchResults ? (
                                <div className="flex flex-col items-center justify-center px-4 py-6 mt-8 rounded-md">
                                    <span className={`${ICONS.info} size-4 text-n-slate-11`} aria-hidden="true" />
                                    <p className="m-2 text-center text-n-slate-11">
                                        {t('SEARCH.EMPTY_STATE_FULL', { query })}
                                    </p>
                                </div>
                            ) : !query ? (
                                <div className="flex flex-col items-center justify-center px-4 py-6 mt-8 text-center rounded-md">
                                    <p className="text-center margin-bottom-0">
                                        <span className={`${ICONS.search} size-6 text-n-slate-11`} aria-hidden="true" />
                                    </p>
                                    <p className="m-2 text-center text-n-slate-11">
                                        {t('SEARCH.EMPTY_STATE_DEFAULT')}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
            </div>
        </Dashboard>
    );
}
