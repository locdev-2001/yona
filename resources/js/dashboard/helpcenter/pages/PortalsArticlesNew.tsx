import { useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dashboard from '../../Dashboard';
import ArticleEditor from '../components/ArticleEditor';
import { createArticle, useHelpCenterState } from '../store';
import { useHelpCenterPage } from './usePortalPage';
import type { DashboardPageProps } from '../../types';

// Port từ routes/dashboard/helpcenter/pages/PortalsArticlesNewPage.vue.
interface PortalsArticlesNewProps {
    portalSlug: string;
    locale: string;
    categorySlug?: string;
    isCategoryArticles?: boolean;
    tab?: string;
}

export default function PortalsArticlesNew({
    portalSlug,
    locale,
    categorySlug = '',
    isCategoryArticles = false,
    tab = '',
}: PortalsArticlesNewProps) {
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    useHelpCenterPage(portalSlug, locale);
    const { categories } = useHelpCenterState();

    const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const isUpdatingRef = useRef(false);
    const articleRef = useRef<{ title?: string; content?: string }>({});

    const categoryIdFromRoute =
        categories.find(category => category.slug === categorySlug)?.id ?? categories[0]?.id ?? null;

    const basePath = `/app/accounts/${accountId}/portals/${portalSlug}/${locale}`;

    const goBackToArticles = () =>
        router.visit(
            isCategoryArticles
                ? `${basePath}/categories/${categorySlug}/articles`
                : `${basePath}/${categorySlug ? `${categorySlug}/` : ''}articles${tab ? `/${tab}` : ''}`,
        );

    const createNewArticle = async ({ title, content }: { title: string; content: string }) => {
        if (title) articleRef.current.title = title;
        if (content) articleRef.current.content = content;

        if (!articleRef.current.title || isUpdatingRef.current) return;

        isUpdatingRef.current = true;
        try {
            const resolvedCategoryId = selectedCategoryId || categoryIdFromRoute;
            const articleId = await createArticle(accountId, portalSlug, {
                content: articleRef.current.content,
                title: articleRef.current.title,
                locale,
                author_id: selectedAuthorId || auth.user?.id,
                category_id: resolvedCategoryId,
            });

            const resolvedSlug = categories.find(category => category.id === resolvedCategoryId)?.slug;

            router.visit(
                isCategoryArticles
                    ? `${basePath}/categories/${resolvedSlug || categorySlug}/articles/${articleId}`
                    : `${basePath}/${categorySlug ? `${resolvedSlug || categorySlug}/` : ''}articles/${tab ? `${tab}/` : ''}edit/${articleId}`,
                { replace: true },
            );
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.EDIT_ARTICLE_PAGE.API.ERROR'));
        } finally {
            isUpdatingRef.current = false;
        }
    };

    return (
        <Dashboard>
            <ArticleEditor
                article={{}}
                portalSlug={portalSlug}
                categorySlug={categorySlug}
                onCreateArticle={createNewArticle}
                onSaveArticle={() => {}}
                onGoBack={goBackToArticles}
                onSetAuthor={setSelectedAuthorId}
                onSetCategory={setSelectedCategoryId}
            />
        </Dashboard>
    );
}
