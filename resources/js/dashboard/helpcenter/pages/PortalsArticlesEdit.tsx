import { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Dashboard from '../../Dashboard';
import ArticleEditor from '../components/ArticleEditor';
import { rendersIdentically } from '../helper/articleDiffHelper';
import { ARTICLE_STATUSES, buildPortalArticleURL } from '../helper/portalHelper';
import { articleById, fetchArticle, updateArticle, useHelpCenterState } from '../store';
import { useHelpCenterPage } from './usePortalPage';
import type { DashboardPageProps } from '../../types';

// Port từ routes/dashboard/helpcenter/pages/PortalsArticlesEditPage.vue.
const SAVED_FLAG_DELAY_MS = 1500;

interface PortalsArticlesEditProps {
    portalSlug: string;
    locale: string;
    articleSlug: string;
    categorySlug?: string;
    tab?: string;
    isCategoryArticles?: boolean;
}

export default function PortalsArticlesEdit({
    portalSlug,
    locale,
    articleSlug,
    categorySlug = '',
    tab = '',
    isCategoryArticles = false,
}: PortalsArticlesEditProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { portal } = useHelpCenterPage(portalSlug, locale);
    useHelpCenterState();

    const [isUpdating, setUpdating] = useState(false);
    const [isSaved, setSaved] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        void fetchArticle(accountId, portalSlug, articleSlug);
    }, [accountId, portalSlug, articleSlug]);

    const article = articleById(articleSlug);

    // Bài đã đăng: sửa tiêu đề/nội dung được dồn vào cột draft_* (không lên trang
    // công khai). Ở trạng thái khác thì lưu thẳng, và dọn bản nháp còn sót để
    // lần đăng sau không moi lại nội dung cũ.
    const stageDraftFields = (values: Record<string, unknown>): Record<string, unknown> => {
        if (article?.status !== ARTICLE_STATUSES.PUBLISHED) {
            const hasStaleDraft = article?.draftTitle != null || article?.draftContent != null;
            if (!hasStaleDraft) return values;

            return {
                ...values,
                title: values.title ?? article?.draftTitle ?? article?.title,
                content: values.content ?? article?.draftContent ?? article?.content,
                draft_title: null,
                draft_content: null,
            };
        }

        const staged: Record<string, unknown> = { ...values };
        (['title', 'content'] as const).forEach(field => {
            if (field in staged) {
                staged[`draft_${field}`] = staged[field];
                delete staged[field];
            }
        });

        // Xoá bản nháp khi nó trùng bản đang đăng (người dùng hoàn tác, hoặc chỉ
        // thêm dòng trống) để không còn nhãn "có thay đổi" mà chẳng có gì khác.
        const liveTitle = article.title ?? '';
        const liveContent = article.content ?? '';
        const nextTitle = (staged.draft_title as string) ?? article.draftTitle ?? liveTitle;
        const nextContent = (staged.draft_content as string) ?? article.draftContent ?? liveContent;
        if (nextTitle === liveTitle && rendersIdentically(liveContent, nextContent)) {
            staged.draft_title = null;
            staged.draft_content = null;
        }

        return staged;
    };

    const saveArticle = async (values: Record<string, unknown>) => {
        setUpdating(true);
        try {
            await updateArticle(accountId, portalSlug, articleSlug, stageDraftFields(values));
            setSaved(true);
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.EDIT_ARTICLE_PAGE.API.ERROR'));
        } finally {
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                setUpdating(false);
                setSaved(true);
            }, SAVED_FLAG_DELAY_MS);
        }
    };

    const basePath = `/app/accounts/${accountId}/portals/${portalSlug}/${locale}`;

    return (
        <Dashboard>
            <ArticleEditor
                article={article ?? {}}
                portalSlug={portalSlug}
                categorySlug={categorySlug}
                isUpdating={isUpdating}
                isSaved={isSaved}
                onSaveArticle={saveArticle}
                onGoBack={() =>
                    router.visit(
                        isCategoryArticles
                            ? `${basePath}/categories/${categorySlug}/articles`
                            : `${basePath}/${categorySlug ? `${categorySlug}/` : ''}articles${tab ? `/${tab}` : ''}`,
                    )
                }
                onPreviewArticle={() =>
                    window.open(
                        buildPortalArticleURL(
                            portalSlug,
                            article?.category?.slug,
                            article?.category?.locale,
                            article?.slug ?? articleSlug,
                            portal?.custom_domain,
                        ),
                        '_blank',
                    )
                }
            />
        </Dashboard>
    );
}
