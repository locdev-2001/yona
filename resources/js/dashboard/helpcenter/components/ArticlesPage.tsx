import { useEffect, useMemo, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import BulkSelectBar from 'dashboard/components-next/captain/assistant/BulkSelectBar';
import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import Input from 'dashboard/components-next/input/Input';
import Loader from 'shared/components/loader/Loader';
import type { TabBarTab } from 'dashboard/components-next/tabbar/TabBar';
import { useClickAway } from 'dashboard/composables/useClickAway';
import ArticleEmptyState from './ArticleEmptyState';
import ArticleHeaderControls from './ArticleHeaderControls';
import ArticleList from './ArticleList';
import CategoryHeaderControls from './CategoryHeaderControls';
import HelpCenterLayout from './HelpCenterLayout';
import { articlesApi } from '../api';
import { hasPendingChanges } from '../helper/articleDiffHelper';
import { ARTICLE_STATUSES, ARTICLE_TABS, CATEGORY_ALL } from '../helper/portalHelper';
import { publishArticleDraft, useHelpCenterState } from '../store';
import type { AllowedLocaleOption, Article, ArticlesMeta, Category } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/ArticlePage/ArticlesPage.vue.
// Nút "Dịch" (Captain) là EE — không port, nên bỏ luôn BulkTranslateDialog.
const ARTICLES_PER_PAGE = 25;

interface ArticlesPageProps {
    articles: Article[];
    categories: Category[];
    allowedLocales: AllowedLocaleOption[];
    portalName: string;
    portalSlug: string;
    locale: string;
    tab?: string;
    categorySlug?: string;
    meta: ArticlesMeta;
    isCategoryArticles?: boolean;
    searchQuery: string;
    onPageChange: (page: number) => void;
    onSearch: (query: string) => void;
    onFetchPortal: (locale: string) => void;
    onRefreshArticles: () => void;
}

export default function ArticlesPage({
    articles,
    categories,
    allowedLocales,
    portalName,
    portalSlug,
    locale,
    tab = '',
    categorySlug = '',
    meta,
    isCategoryArticles = false,
    searchQuery,
    onPageChange,
    onSearch,
    onFetchPortal,
    onRefreshArticles,
}: ArticlesPageProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { isFetchingArticles, portalUiFlags } = useHelpCenterState();

    const [selectedArticleIds, setSelectedArticleIds] = useState<Set<number>>(new Set());
    const [isArticleDragging, setArticleDragging] = useState(false);
    const [isCategoryMenuOpen, setCategoryMenuOpen] = useState(false);
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const deleteConfirmDialogRef = useRef<DialogHandle>(null);
    const categoryMenuRef = useRef<HTMLDivElement>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useClickAway(categoryMenuRef, () => setCategoryMenuOpen(false), isCategoryMenuOpen);

    // Bỏ chọn khi danh sách đổi (đổi trang, đổi bộ lọc).
    useEffect(() => setSelectedArticleIds(new Set()), [articles]);

    const isSwitchingPortal = portalUiFlags.isSwitching;
    const hasNoArticles = !isFetchingArticles && !articles.length;
    const isLoading = isFetchingArticles || isSwitchingPortal;
    const hasNoArticlesInPortal = meta.allArticlesCount === 0 && !isCategoryArticles;
    const shouldShowPaginationFooter = !(isFetchingArticles || isSwitchingPortal || hasNoArticles);
    const isSearching = Boolean(searchQuery?.trim());

    const articlesCount = useMemo(() => {
        const countMap: Record<string, number> = {
            '': meta.articlesCount,
            mine: meta.mineArticlesCount,
            draft: meta.draftArticlesCount,
            archived: meta.archivedArticlesCount,
        };

        return Number(countMap[tab] || countMap['']);
    }, [meta, tab]);

    const totalPages = Math.ceil(articlesCount / ARTICLES_PER_PAGE) || 1;

    const articlesBasePath = `/app/accounts/${accountId}/portals/${portalSlug}`;

    const updateRoute = (params: { locale?: string; tab?: string; categorySlug?: string }) => {
        const nextLocale = params.locale ?? locale;
        const nextTab = params.tab ?? tab;
        const nextCategorySlug = params.categorySlug ?? categorySlug;
        const categorySegment = nextCategorySlug ? `${nextCategorySlug}/` : '';
        const tabSegment = nextTab ? `/${nextTab}` : '';

        router.visit(`${articlesBasePath}/${nextLocale}/${categorySegment}articles${tabSegment}`);
    };

    const navigateToNewArticlePage = () => {
        router.visit(
            isCategoryArticles
                ? `${articlesBasePath}/${locale}/categories/${categorySlug}/articles/new`
                : `${articlesBasePath}/${locale}/${categorySlug ? `${categorySlug}/` : ''}articles/new`,
        );
    };

    const getEmptyStateText = (type: string) => {
        if (isSearching) return t(`HELP_CENTER.ARTICLES_PAGE.EMPTY_STATE.SEARCH.${type}`);
        if (isCategoryArticles) return t(`HELP_CENTER.ARTICLES_PAGE.EMPTY_STATE.CATEGORY.${type}`);

        return t(`HELP_CENTER.ARTICLES_PAGE.EMPTY_STATE.${(tab || 'all').toUpperCase()}.${type}`);
    };

    const onBulkActionSuccess = (message: string) => {
        useAlert(message);
        setSelectedArticleIds(new Set());
        onRefreshArticles();
    };

    const bulkUpdateStatus = async (status: string) => {
        const selectedIds = [...selectedArticleIds];
        const pendingIds = articles
            .filter(
                article =>
                    selectedIds.includes(article.id) &&
                    article.status === ARTICLE_STATUSES.PUBLISHED &&
                    hasPendingChanges(article),
            )
            .map(article => article.id);

        // Đăng bài sẽ đẩy từng bản nháp lên; đổi trạng thái khác thì bỏ qua chúng.
        const isPublishing = status === ARTICLE_STATUSES.PUBLISHED;
        const draftIds = isPublishing ? pendingIds : [];
        const skippedCount = isPublishing ? 0 : pendingIds.length;
        const articleIds = selectedIds.filter(id => !pendingIds.includes(id));

        if (!articleIds.length && !draftIds.length) {
            useAlert(t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.STATUS_SKIPPED_ALL'));

            return;
        }

        try {
            if (articleIds.length) await articlesApi.bulkUpdateStatus(accountId, portalSlug, articleIds, status);
            await Promise.all(draftIds.map(articleId => publishArticleDraft(accountId, portalSlug, articleId)));
            onBulkActionSuccess(t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.STATUS_SUCCESS'));
            if (skippedCount) {
                useAlert(t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.STATUS_SKIPPED', { count: skippedCount }));
            }
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.STATUS_ERROR'));
        }
    };

    const handleBulkUpdateCategory = async (categoryId: number) => {
        setCategoryMenuOpen(false);
        try {
            await articlesApi.bulkUpdateCategory(accountId, portalSlug, [...selectedArticleIds], categoryId);
            onBulkActionSuccess(t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.CATEGORY_SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.CATEGORY_ERROR'));
        }
    };

    const bulkDelete = async () => {
        try {
            await articlesApi.bulkDelete(accountId, portalSlug, [...selectedArticleIds]);
            deleteConfirmDialogRef.current?.close();
            onBulkActionSuccess(t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.DELETE_SUCCESS'));
        } catch (error) {
            deleteConfirmDialogRef.current?.close();
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.DELETE_ERROR'));
        }
    };

    const categoryMenuItems = categories.map(category => ({
        label: category.name,
        value: category.id,
        action: 'move',
        emoji: category.icon,
        iconColor: category.icon_color,
    }));

    const handleTabChange = (selectedTab: TabBarTab) =>
        updateRoute({ tab: selectedTab.value === ARTICLE_TABS.ALL ? '' : selectedTab.value });

    const bulkActionButtons = (
        <div className="flex items-center gap-2 ml-auto">
            <Button
                sm
                faded
                slate
                icon="i-lucide-check"
                label={t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.PUBLISH')}
                className="[&>span:nth-child(2)]:hidden sm:[&>span:nth-child(2)]:inline w-fit"
                onClick={() => bulkUpdateStatus('published')}
            />
            <Button
                sm
                faded
                slate
                icon="i-lucide-pencil-line"
                label={t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.DRAFT')}
                className="[&>span:nth-child(2)]:hidden sm:[&>span:nth-child(2)]:inline w-fit"
                onClick={() => bulkUpdateStatus('draft')}
            />
            <Button
                sm
                faded
                slate
                icon="i-lucide-archive-restore"
                label={t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.ARCHIVE')}
                className="[&>span:nth-child(2)]:hidden sm:[&>span:nth-child(2)]:inline w-fit"
                onClick={() => bulkUpdateStatus('archived')}
            />
            {categoryMenuItems.length ? (
                <div className="relative group">
                    <div ref={categoryMenuRef}>
                        <Button
                            sm
                            faded
                            slate
                            icon="i-lucide-folder-input"
                            label={t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.MOVE_TO_CATEGORY')}
                            className="[&>span:nth-child(2)]:hidden sm:[&>span:nth-child(2)]:inline w-fit"
                            onClick={() => setCategoryMenuOpen(open => !open)}
                        />
                        {isCategoryMenuOpen ? (
                            <DropdownMenu
                                menuItems={categoryMenuItems}
                                showSearch
                                className="right-0 w-48 mt-2 top-full max-h-60"
                                onAction={item => handleBulkUpdateCategory(Number(item.value))}
                            />
                        ) : null}
                    </div>
                </div>
            ) : null}
            <Button
                sm
                faded
                ruby
                icon="i-lucide-trash"
                label={t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.DELETE')}
                className="!px-1.5 [&>span:nth-child(2)]:hidden"
                onClick={() => deleteConfirmDialogRef.current?.open()}
            />
        </div>
    );

    return (
        <HelpCenterLayout
            currentPage={Number(meta.currentPage)}
            totalItems={articlesCount}
            itemsPerPage={ARTICLES_PER_PAGE}
            portalSlug={portalSlug}
            breadcrumbLabel={t('HELP_CENTER.BREADCRUMB.ARTICLES')}
            showPaginationFooter={shouldShowPaginationFooter}
            onPageChange={onPageChange}
            titleActions={
                !isSwitchingPortal ? (
                    <Input
                        value={localSearch}
                        placeholder={t('HELP_CENTER.ARTICLES_PAGE.ARTICLES_HEADER.SEARCH_PLACEHOLDER')}
                        type="search"
                        size="sm"
                        className="w-full max-w-[16rem] min-w-0"
                        onChange={event => {
                            const value = event.target.value;
                            setLocalSearch(value);
                            clearTimeout(searchTimerRef.current);
                            searchTimerRef.current = setTimeout(() => onSearch(value), 500);
                        }}
                    />
                ) : null
            }
            headerActions={
                <div className="flex items-end justify-between">
                    {!isCategoryArticles && !isSwitchingPortal ? (
                        <ArticleHeaderControls
                            categories={categories}
                            allowedLocales={allowedLocales}
                            meta={meta}
                            activeTab={tab}
                            activeLocale={locale}
                            activeCategorySlug={categorySlug}
                            onTabChange={handleTabChange}
                            onLocaleChange={value => {
                                updateRoute({ locale: value, categorySlug: '' });
                                onFetchPortal(value);
                            }}
                            onCategoryChange={value =>
                                updateRoute({ categorySlug: value === CATEGORY_ALL ? '' : value })
                            }
                            onNewArticle={navigateToNewArticlePage}
                        />
                    ) : isCategoryArticles && !isSwitchingPortal ? (
                        <CategoryHeaderControls
                            categories={categories}
                            allowedLocales={allowedLocales}
                            hasSelectedCategory={isCategoryArticles}
                            portalSlug={portalSlug}
                            locale={locale}
                            categorySlug={categorySlug}
                            onNewArticle={navigateToNewArticlePage}
                        />
                    ) : null}
                </div>
            }
            content={
                isLoading && !isArticleDragging ? (
                    <div className="flex items-center justify-center py-10 text-n-slate-11">
                        <Loader />
                    </div>
                ) : !hasNoArticles ? (
                    <>
                        {selectedArticleIds.size > 0 ? (
                            <div className="sticky top-0 z-[5] bg-gradient-to-b from-n-surface-1 from-90% to-transparent pt-1 pb-2">
                                <BulkSelectBar
                                    selectedIds={selectedArticleIds}
                                    allItems={articles.map(article => ({ id: article.id }))}
                                    selectAllLabel={t('HELP_CENTER.ARTICLES_PAGE.BULK_TRANSLATE.SELECT_ALL', {
                                        count: articles.length,
                                    })}
                                    selectedCountLabel={t('HELP_CENTER.ARTICLES_PAGE.BULK_TRANSLATE.SELECTED_COUNT', {
                                        count: selectedArticleIds.size,
                                    })}
                                    className="py-2 ltr:!pr-3 rtl:!pl-3 justify-between"
                                    secondaryActions={
                                        <Button
                                            sm
                                            ghost
                                            slate
                                            label={t('HELP_CENTER.ARTICLES_PAGE.BULK_TRANSLATE.CLEAR_SELECTION')}
                                            className="!px-1.5"
                                            onClick={() => setSelectedArticleIds(new Set())}
                                        />
                                    }
                                    actions={bulkActionButtons}
                                    onChange={setSelectedArticleIds}
                                />
                            </div>
                        ) : null}
                        <ArticleList
                            articles={articles}
                            portalSlug={portalSlug}
                            locale={locale}
                            tab={tab}
                            categorySlug={categorySlug}
                            isCategoryArticles={isCategoryArticles}
                            isSearching={isSearching}
                            selectedArticleIds={selectedArticleIds}
                            currentPage={Number(meta.currentPage)}
                            totalPages={totalPages}
                            className="relative z-0"
                            onToggleSelect={id =>
                                setSelectedArticleIds(current => {
                                    const next = new Set(current);
                                    if (next.has(id)) next.delete(id);
                                    else next.add(id);

                                    return next;
                                })
                            }
                            onNavigatePage={onPageChange}
                            onDragging={setArticleDragging}
                        />
                    </>
                ) : (
                    <ArticleEmptyState
                        className="pt-14"
                        title={getEmptyStateText('TITLE')}
                        subtitle={getEmptyStateText('SUBTITLE')}
                        showButton={hasNoArticlesInPortal && !isSearching}
                        buttonLabel={t('HELP_CENTER.ARTICLES_PAGE.EMPTY_STATE.ALL.BUTTON_LABEL')}
                        onClick={navigateToNewArticlePage}
                    />
                )
            }
        >
            <Dialog
                ref={deleteConfirmDialogRef}
                type="alert"
                title={t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.DELETE_CONFIRM_TITLE', {
                    count: selectedArticleIds.size,
                })}
                description={t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.DELETE_CONFIRM_DESCRIPTION', {
                    count: selectedArticleIds.size,
                })}
                confirmButtonLabel={t('HELP_CENTER.ARTICLES_PAGE.BULK_ACTIONS.DELETE_CONFIRM')}
                onConfirm={bulkDelete}
            />
        </HelpCenterLayout>
    );
}
