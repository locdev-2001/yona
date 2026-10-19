import { useCallback, useEffect, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Dashboard from '../../Dashboard';
import ArticlesPage from '../components/ArticlesPage';
import { getArticleStatus } from '../helper/portalHelper';
import { fetchArticles, fetchCategories, fetchPortalMeta, useHelpCenterState } from '../store';
import { useHelpCenterPage } from './usePortalPage';
import type { DashboardPageProps } from '../../types';

// Port từ routes/dashboard/helpcenter/pages/PortalsArticlesIndexPage.vue.
interface PortalsArticlesIndexProps {
    portalSlug: string;
    locale: string;
    categorySlug?: string;
    tab?: string;
    isCategoryArticles?: boolean;
}

export default function PortalsArticlesIndex({
    portalSlug,
    locale,
    categorySlug = '',
    tab = '',
    isCategoryArticles = false,
}: PortalsArticlesIndexProps) {
    const { auth } = usePage<DashboardPageProps>().props;
    const { accountId, portal, allowedLocales } = useHelpCenterPage(portalSlug, locale);
    const { articles, articlesMeta, categories } = useHelpCenterState();

    const [pageNumber, setPageNumber] = useState(1);
    const [searchQuery, setSearchQuery] = useState(
        () => new URLSearchParams(window.location.search).get('search') ?? '',
    );

    const load = useCallback(
        (page: number, query: string) =>
            fetchArticles(accountId, portalSlug, {
                pageNumber: page,
                locale,
                status: getArticleStatus(tab),
                authorId: tab === 'mine' ? auth.user?.id : null,
                categorySlug,
                query: query || undefined,
            }),
        [accountId, portalSlug, locale, tab, categorySlug, auth.user?.id],
    );

    useEffect(() => {
        setPageNumber(1);
        void load(1, searchQuery);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load]);

    // Danh mục hiển thị theo thứ tự position ở màn theo danh mục (nơi kéo thả bật).
    const orderedArticles = isCategoryArticles
        ? [...articles].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        : articles;

    return (
        <Dashboard>
            <div className="w-full h-full">
                {portal ? (
                    <ArticlesPage
                        articles={orderedArticles}
                        portalName={portal.name}
                        portalSlug={portalSlug}
                        locale={locale}
                        tab={tab}
                        categorySlug={categorySlug}
                        categories={categories}
                        allowedLocales={allowedLocales}
                        meta={articlesMeta}
                        isCategoryArticles={isCategoryArticles}
                        searchQuery={searchQuery}
                        onPageChange={page => {
                            setPageNumber(page);
                            void load(page, searchQuery);
                        }}
                        onSearch={query => {
                            setSearchQuery(query);
                            setPageNumber(1);
                            const url = new URL(window.location.href);
                            if (query) url.searchParams.set('search', query);
                            else url.searchParams.delete('search');
                            window.history.replaceState({}, '', url.toString());
                            void load(1, query);
                        }}
                        onFetchPortal={async nextLocale => {
                            await fetchPortalMeta(accountId, portalSlug, nextLocale);
                            await fetchCategories(accountId, portalSlug, nextLocale);
                        }}
                        onRefreshArticles={() => void load(pageNumber, searchQuery)}
                    />
                ) : null}
            </div>
        </Dashboard>
    );
}
