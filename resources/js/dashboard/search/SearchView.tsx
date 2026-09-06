import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../i18n';
import Dashboard from '../Dashboard';
import Button from 'dashboard/components-next/button/Button';
import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import SearchHeader from './components/SearchHeader';
import SearchTabs, { type SearchTabConfig } from './components/SearchTabs';
import SearchResultArticlesList from './components/SearchResultArticlesList';
import SearchResultContactsList from './components/SearchResultContactsList';
import SearchResultConversationsList from './components/SearchResultConversationsList';
import SearchResultMessagesList from './components/SearchResultMessagesList';
import { generateURLParams, parseURLParams } from './helpers/searchHelper';
import { clearSearchResults, fullSearch, searchByKind, useSearchState, type SearchRecordKind } from './store';
import type { SearchFilterState, SearchTab } from './types';
import type { DashboardPageProps } from '../types';

// Port từ dashboard/modules/search/components/SearchView.vue.
// Khác biệt cố ý: Policy/permission vai trò tuỳ biến là EE — CE mọi vai trò
// thấy đủ mục, nên chỉ còn cờ tính năng help_center (tab Articles) và
// advanced_search (bộ lọc) quyết định hiển thị.
const ALL_TAB: SearchTab = 'all';
const PREVIEW_COUNT = 5;

const TAB_KEYS: SearchTab[] = ['all', 'contacts', 'conversations', 'messages', 'articles'];

export default function SearchView({ tab }: { tab?: string | null }) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const isAdvancedSearchEnabled = Boolean(currentAccount.features?.advanced_search);
    const isHelpCenterEnabled = Boolean(currentAccount.features?.help_center);

    const [selectedTab, setSelectedTab] = useState<SearchTab>((tab as SearchTab) || ALL_TAB);
    const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '');
    const [filters, setFilters] = useState<SearchFilterState>(() =>
        parseURLParams(
            Object.fromEntries(new URLSearchParams(window.location.search).entries()),
            isAdvancedSearchEnabled,
        ),
    );
    const pages = useRef<Record<Exclude<SearchTab, 'all'>, number>>({
        contacts: 1,
        conversations: 1,
        messages: 1,
        articles: 1,
    });

    const { contactRecords, conversationRecords, messageRecords, articleRecords, uiFlags } = useSearchState();

    const isSelectedTabAll = selectedTab === ALL_TAB;
    const sliceIfAllTab = <T,>(items: T[]) => (isSelectedTabAll ? items.slice(0, PREVIEW_COUNT) : items);

    const contacts = sliceIfAllTab(contactRecords);
    const conversations = sliceIfAllTab(conversationRecords);
    const messages = sliceIfAllTab(messageRecords);
    const articles = sliceIfAllTab(articleRecords);

    const tabs: SearchTabConfig[] = useMemo(
        () =>
            TAB_KEYS.filter(key => key !== 'articles' || isHelpCenterEnabled).map(key => ({
                key,
                name: t(`SEARCH.TABS.${key.toUpperCase()}`),
                count:
                    key === ALL_TAB
                        ? null
                        : {
                              contacts: contactRecords.length,
                              conversations: conversationRecords.length,
                              messages: messageRecords.length,
                              articles: articleRecords.length,
                          }[key as Exclude<SearchTab, 'all'>],
                showBadge: key !== ALL_TAB,
            })),
        [
            isHelpCenterEnabled,
            contactRecords.length,
            conversationRecords.length,
            messageRecords.length,
            articleRecords.length,
        ],
    );

    const totalSearchResultsCount =
        contacts.length + conversations.length + messages.length + (isHelpCenterEnabled ? articles.length : 0);

    const activeTabIndex = Math.max(
        0,
        tabs.findIndex(item => item.key === selectedTab),
    );

    const isFetchingAny =
        uiFlags.isFetching ||
        uiFlags.contact.isFetching ||
        uiFlags.message.isFetching ||
        uiFlags.conversation.isFetching ||
        uiFlags.article.isFetching;

    const showEmptySearchResults =
        totalSearchResultsCount === 0 && uiFlags.isSearchCompleted && isSelectedTabAll && !isFetchingAny && !!query;

    const showResultsSection =
        (uiFlags.isSearchCompleted && totalSearchResultsCount !== 0) ||
        isFetchingAny ||
        (!isSelectedTabAll && !!query && !isFetchingAny);

    const hasMoreByTab: Record<Exclude<SearchTab, 'all'>, boolean | undefined> = {
        contacts: uiFlags.contact.hasMore,
        conversations: uiFlags.conversation.hasMore,
        messages: uiFlags.message.hasMore,
        articles: uiFlags.article.hasMore,
    };
    const recordsByTab: Record<Exclude<SearchTab, 'all'>, unknown[]> = {
        contacts: contactRecords,
        conversations: conversationRecords,
        messages: messageRecords,
        articles: articleRecords,
    };

    const showLoadMore =
        !!query &&
        !isFetchingAny &&
        !isSelectedTabAll &&
        recordsByTab[selectedTab as Exclude<SearchTab, 'all'>]?.length > 0 &&
        Boolean(hasMoreByTab[selectedTab as Exclude<SearchTab, 'all'>]);

    const showViewMore = (kind: Exclude<SearchTab, 'all'>) =>
        recordsByTab[kind].length > PREVIEW_COUNT && isSelectedTabAll;

    // Chỉ đính kèm bộ lọc khi advanced_search bật; from/inboxId chỉ dành cho tin nhắn.
    const buildSearchPayload = useCallback(
        (
            base: { q: string; page: number },
            searchType: string = 'message',
            activeFilters: SearchFilterState = filters,
        ) => {
            if (!isAdvancedSearchEnabled) return base;

            return {
                ...base,
                ...(activeFilters.dateRange.from ? { since: activeFilters.dateRange.from } : {}),
                ...(activeFilters.dateRange.to ? { until: activeFilters.dateRange.to } : {}),
                ...(searchType === 'message' && activeFilters.from ? { from: activeFilters.from } : {}),
                ...(searchType === 'message' && activeFilters.in ? { inboxId: activeFilters.in } : {}),
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
            pages.current = { contacts: 1, conversations: 1, messages: 1, articles: 1 };
            clearSearchResults();
            updateURL(nextQuery, selectedTab, nextFilters);
            if (!nextQuery) return;

            void fullSearch(accountId, buildSearchPayload({ q: nextQuery, page: 1 }, 'message', nextFilters));
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
        if (uiFlags.isFetching || isSelectedTabAll) return;

        const kind = selectedTab as Exclude<SearchTab, 'all'>;
        pages.current[kind] += 1;
        const success = await searchByKind(
            kind as SearchRecordKind,
            accountId,
            buildSearchPayload({ q: query, page: pages.current[kind] }, kind),
        );
        // Lỗi thì lùi lại để lần thử sau lấy đúng trang chưa nạp được.
        if (!success) pages.current[kind] -= 1;
    };

    const onTabChange = (nextTab: SearchTab) => {
        setSelectedTab(nextTab);
        updateURL(query, nextTab, filters);
    };

    const viewMoreButton = (kind: Exclude<SearchTab, 'all'>) =>
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
    const showKind = (kind: Exclude<SearchTab, 'all'>) => selectedTab === kind || isSelectedTabAll;

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
                                        {showKind('contacts') ? (
                                            <SearchResultContactsList
                                                isFetching={uiFlags.contact.isFetching}
                                                contacts={contacts}
                                                accountId={accountId}
                                                query={query}
                                                showTitle={isSelectedTabAll}
                                                className="mt-0.5"
                                            />
                                        ) : null}
                                        {viewMoreButton('contacts')}
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
                                        {showKind('conversations') ? (
                                            <SearchResultConversationsList
                                                isFetching={uiFlags.conversation.isFetching}
                                                conversations={conversations}
                                                accountId={accountId}
                                                query={query}
                                                showTitle={isSelectedTabAll}
                                                className={sectionClass}
                                            />
                                        ) : null}
                                        {viewMoreButton('conversations')}
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
                                    <FluentIcon icon="info" size="16" className="text-n-slate-11" />
                                    <p className="m-2 text-center text-n-slate-11">
                                        {t('SEARCH.EMPTY_STATE_FULL', { query })}
                                    </p>
                                </div>
                            ) : !query ? (
                                <div className="flex flex-col items-center justify-center px-4 py-6 mt-8 text-center rounded-md">
                                    <p className="text-center margin-bottom-0">
                                        <FluentIcon icon="search" size="24" className="text-n-slate-11" />
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
