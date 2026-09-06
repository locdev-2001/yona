import { useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import DraggableReorderList from 'dashboard/components-next/DraggableReorderList/DraggableReorderList';
import ArticleCard from './ArticleCard';
import { hasPendingChanges } from '../helper/articleDiffHelper';
import { ARTICLE_STATUSES, getArticleStatus } from '../helper/portalHelper';
import {
    categoryById,
    deleteArticle,
    discardArticleDraft,
    fetchPortalMeta,
    refreshArticlesMeta,
    reorderArticles,
    updateArticle,
    useHelpCenterState,
} from '../store';
import type { Article } from '../types';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/ArticlePage/ArticleList.vue.
// wootConstants.ARTICLE_STATUS_TYPES: publish = 1, draft = 0, archive = 2.
const STATUS_MESSAGE_KEY: Record<number, string> = {
    1: 'PUBLISH_ARTICLE',
    2: 'ARCHIVE_ARTICLE',
    0: 'DRAFT_ARTICLE',
};

interface ArticleListProps {
    articles: Article[];
    portalSlug: string;
    locale: string;
    tab?: string;
    categorySlug?: string;
    isCategoryArticles?: boolean;
    isSearching?: boolean;
    selectedArticleIds: Set<number>;
    currentPage?: number;
    totalPages?: number;
    className?: string;
    onToggleSelect: (id: number) => void;
    onNavigatePage: (page: number) => void;
    onDragging: (isDragging: boolean) => void;
}

export default function ArticleList({
    articles,
    portalSlug,
    locale,
    tab,
    categorySlug,
    isCategoryArticles = false,
    isSearching = false,
    selectedArticleIds,
    currentPage = 1,
    totalPages = 1,
    className = '',
    onToggleSelect,
    onNavigatePage,
    onDragging,
}: ArticleListProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const [hoveredArticleId, setHoveredArticleId] = useState<number | null>(null);
    useHelpCenterState();

    const canReorder = articles.length > 1 || totalPages > 1;
    const dragEnabled = isCategoryArticles && !isSearching && canReorder && selectedArticleIds.size === 0;
    const hasBulkSelection = selectedArticleIds.size > 0;

    const getCategory = (categoryId?: number) => categoryById(categoryId) ?? { name: '', icon: '' };

    const openArticle = (id: number) => {
        const base = `/app/accounts/${accountId}/portals/${portalSlug}/${locale}`;
        router.visit(
            isCategoryArticles
                ? `${base}/categories/${categorySlug}/articles/${id}`
                : `${base}/${categorySlug ? `${categorySlug}/` : ''}articles/${tab ? `${tab}/` : ''}edit/${id}`,
        );
    };

    const onReorder = async (positions: Record<string, number>) => {
        const [movedId] = Object.keys(positions);
        // Kéo trong cùng trang đã cập nhật lạc quan ở store nên không cần tải lại.
        // Chỉ khi thả sang trang khác mới phải làm mới để kéo phần tử vào đúng chỗ.
        const isCrossPage = !articles.some(article => String(article.id) === movedId);
        try {
            await reorderArticles(accountId, portalSlug, positions);
            if (isCrossPage) onNavigatePage(currentPage);
        } catch {
            useAlert(t('HELP_CENTER.REORDER_ARTICLE.API.ERROR_MESSAGE'));
        }
    };

    const statusMessage = (status: number | undefined, isSuccess: boolean) => {
        const key = status === undefined ? undefined : STATUS_MESSAGE_KEY[status];

        return key ? t(`HELP_CENTER.${key}.API.${isSuccess ? 'SUCCESS' : 'ERROR'}`) : '';
    };

    const refreshArticleMeta = async () => {
        await refreshArticlesMeta(accountId, portalSlug, locale);
        await fetchPortalMeta(accountId, portalSlug, locale);
    };

    const handleArticleAction = async (action: string, { status, id }: { status?: number; id: number }) => {
        try {
            if (action === 'delete') {
                await deleteArticle(accountId, portalSlug, id);
                useAlert(t('HELP_CENTER.DELETE_ARTICLE.API.SUCCESS_MESSAGE'));
            } else if (action === 'discard-draft') {
                await discardArticleDraft(accountId, portalSlug, id);
                useAlert(t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.DISCARD_CHANGES_SUCCESS'));
            } else {
                await updateArticle(accountId, portalSlug, id, { status });
                useAlert(statusMessage(status, true));
            }
            await refreshArticleMeta();
        } catch (error) {
            const fallback =
                action === 'delete'
                    ? t('HELP_CENTER.DELETE_ARTICLE.API.ERROR_MESSAGE')
                    : action === 'discard-draft'
                      ? t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.DISCARD_CHANGES_ERROR')
                      : statusMessage(status, false);
            useAlert(parseApiErrorMessage(error) || fallback);
        }
    };

    const renderCard = (item: Article, interactive: boolean) => (
        <ArticleCard
            id={item.id}
            title={item.title}
            status={item.status}
            author={item.author}
            category={getCategory(item.category?.id)}
            views={item.views || 0}
            updatedAt={item.updatedAt}
            portalSlug={portalSlug}
            isSelected={interactive ? selectedArticleIds.has(item.id) : false}
            hasPendingChanges={item.status === ARTICLE_STATUSES.PUBLISHED && hasPendingChanges(item)}
            selectable={interactive}
            showSelectionControl={interactive && (hoveredArticleId === item.id || hasBulkSelection)}
            onOpenArticle={interactive ? openArticle : undefined}
            onArticleAction={
                interactive
                    ? ({ action, value, id }) =>
                          handleArticleAction(action, {
                              status: action !== 'delete' ? getArticleStatus(String(value)) : undefined,
                              id,
                          })
                    : undefined
            }
            onDraftResolved={
                interactive
                    ? status => {
                          useAlert(statusMessage(status, true));
                          refreshArticleMeta();
                      }
                    : undefined
            }
            onDraftFailed={
                interactive
                    ? error =>
                          useAlert(
                              parseApiErrorMessage(error) ||
                                  t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.PUBLISH_CHANGES_ERROR'),
                          )
                    : undefined
            }
            onToggleSelect={interactive ? onToggleSelect : undefined}
            onHover={interactive ? isHovered => setHoveredArticleId(isHovered ? item.id : null) : undefined}
        />
    );

    return (
        <DraggableReorderList
                items={articles}
                disabled={!dragEnabled}
                className={className}
                currentPage={currentPage}
                totalPages={totalPages}
                renderItem={item => renderCard(item, true)}
                renderGhost={item => renderCard(item, false)}
                onReorder={onReorder}
                onNavigatePage={onNavigatePage}
                onDragging={onDragging}
        />
    );
}
