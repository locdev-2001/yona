import { useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import Button from 'dashboard/components-next/button/Button';
import ButtonGroup from 'dashboard/components-next/buttonGroup/ButtonGroup';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useClickAway } from 'dashboard/composables/useClickAway';
import ArticlePendingChangesPopover from './ArticlePendingChangesPopover';
import type { PendingChangesPopoverHandle } from './ArticlePendingChangesPopover';
import {
    ARTICLE_EDITOR_STATUS_OPTIONS,
    ARTICLE_MENU_ITEMS,
    ARTICLE_STATUSES,
    getArticleStatus,
} from '../helper/portalHelper';
import { articleUiFlags, discardArticleDraft, publishArticleDraft, updateArticle, useHelpCenterState } from '../store';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/ArticleEditorPage/ArticleEditorHeader.vue.
const STATUS_MESSAGE_KEY: Record<number, string> = { 1: 'PUBLISH_ARTICLE', 2: 'ARCHIVE_ARTICLE', 0: 'DRAFT_ARTICLE' };

interface ArticleEditorHeaderProps {
    isUpdating?: boolean;
    isSaved?: boolean;
    status?: string;
    articleId?: number;
    portalSlug: string;
    pendingChanges?: boolean;
    isSaving?: boolean;
    onGoBack: () => void;
    onPreviewArticle: () => void;
    onShowDiff: () => void;
}

export default function ArticleEditorHeader({
    isUpdating = false,
    isSaved = false,
    status = '',
    articleId = 0,
    portalSlug,
    pendingChanges = false,
    isSaving = false,
    onGoBack,
    onPreviewArticle,
    onShowDiff,
}: ArticleEditorHeaderProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    useHelpCenterState();

    const [isArticlePublishing, setArticlePublishing] = useState(false);
    const [showArticleActionMenu, setShowArticleActionMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const pendingChangesPopoverRef = useRef<PendingChangesPopoverHandle>(null);
    useClickAway(menuRef, () => setShowArticleActionMenu(false), showArticleActionMenu);

    const isUpdatingArticle = Boolean(articleUiFlags(articleId).isUpdating);
    const isPublished = status === ARTICLE_STATUSES.PUBLISHED;
    const hasPendingChanges = isPublished && pendingChanges;

    // Đăng khi bản lưu còn đang bay sẽ đẩy nhầm bản nháp cũ — chặn và báo.
    const blockedWhileSaving = () => {
        if (!isSaving && !isUpdatingArticle) return false;
        useAlert(t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.SAVE_IN_PROGRESS'));

        return true;
    };

    const articleMenuItems = useMemo<DropdownMenuItem[]>(() => {
        const items = (ARTICLE_EDITOR_STATUS_OPTIONS[status] ?? []).map(option => {
            const { label, value, icon } = ARTICLE_MENU_ITEMS[option];

            return { label: t(label), value, action: 'update-status', icon };
        });

        if (hasPendingChanges) {
            items.push({
                label: t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.DISCARD_CHANGES'),
                value: 'discard-draft',
                action: 'discard-draft',
                icon: 'i-lucide-undo-2',
            });
        }

        return items as DropdownMenuItem[];
    }, [status, hasPendingChanges]);

    const statusMessage = (statusCode: number | undefined, isSuccess: boolean) => {
        const key = statusCode === undefined ? undefined : STATUS_MESSAGE_KEY[statusCode];

        return key ? t(`HELP_CENTER.${key}.API.${isSuccess ? 'SUCCESS' : 'ERROR'}`) : '';
    };

    // draftAction: publishDraft/discardDraft để giải quyết bản nháp trong cùng
    // lần cập nhật; bỏ trống khi chỉ đổi trạng thái.
    const performStatusUpdate = async (value: string, draftAction?: 'publishDraft') => {
        const statusCode = getArticleStatus(value);
        if (statusCode === 1) setArticlePublishing(true);

        try {
            if (draftAction === 'publishDraft') {
                await publishArticleDraft(accountId, portalSlug, articleId, statusCode);
            } else {
                await updateArticle(accountId, portalSlug, articleId, { status: statusCode });
            }
            useAlert(statusMessage(statusCode, true));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || statusMessage(statusCode, false));
        } finally {
            setArticlePublishing(false);
        }
    };

    const updateArticleStatus = (value: string) => {
        setShowArticleActionMenu(false);
        // Rời trạng thái đã đăng khi còn sửa chưa lưu — hỏi áp dụng hay bỏ trước.
        if (hasPendingChanges) {
            pendingChangesPopoverRef.current?.open(getArticleStatus(value));

            return;
        }
        void performStatusUpdate(value);
    };

    const publishDraftChanges = async () => {
        setArticlePublishing(true);
        try {
            await publishArticleDraft(accountId, portalSlug, articleId);
            useAlert(t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.PUBLISH_CHANGES_SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.PUBLISH_CHANGES_ERROR'));
        } finally {
            setArticlePublishing(false);
        }
    };

    const discardDraftChanges = async () => {
        try {
            await discardArticleDraft(accountId, portalSlug, articleId);
            useAlert(t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.DISCARD_CHANGES_SUCCESS'));
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.DISCARD_CHANGES_ERROR'));
        }
    };

    const onPrimaryAction = () => {
        if (blockedWhileSaving()) return;

        if (hasPendingChanges) {
            void publishDraftChanges();
        } else if (pendingChanges) {
            // Đẩy phần nháp còn sót lên khi đăng, thay vì đăng lại nội dung cũ.
            void performStatusUpdate(ARTICLE_STATUSES.PUBLISHED, 'publishDraft');
        } else {
            updateArticleStatus(ARTICLE_STATUSES.PUBLISHED);
        }
    };

    return (
        <div className="flex items-center justify-between h-20">
            <Button
                label={t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.BACK_TO_ARTICLES')}
                icon="i-lucide-chevron-left"
                variant="link"
                color="slate"
                size="sm"
                className="ltr:pl-3 rtl:pr-3"
                onClick={onGoBack}
            />
            <div className="flex items-center gap-4">
                {hasPendingChanges ? (
                    <button
                        type="button"
                        title={t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.VIEW_CHANGES')}
                        className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors rounded-lg cursor-pointer text-n-amber-11 bg-n-amber-3 outline outline-1 outline-n-amber-5 hover:bg-n-amber-4"
                        onClick={onShowDiff}
                    >
                        <span className="rounded-full size-1.5 bg-n-amber-9 shrink-0" />
                        {t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.PENDING_CHANGES')}
                    </button>
                ) : null}
                {isUpdating || isSaved ? (
                    <span className="text-xs font-medium transition-all duration-300 text-n-slate-11">
                        {t(`HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.STATUS.${isUpdating ? 'SAVING' : 'SAVED'}`)}
                    </span>
                ) : null}
                <div className="relative flex items-center gap-2">
                    <Button
                        label={t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.PREVIEW')}
                        color="slate"
                        size="sm"
                        disabled={!articleId}
                        onClick={onPreviewArticle}
                    />
                    <ButtonGroup className="flex items-center">
                        <Button
                            label={
                                hasPendingChanges
                                    ? t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.PUBLISH_CHANGES')
                                    : t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.PUBLISH')
                            }
                            size="sm"
                            className="ltr:rounded-r-none rtl:rounded-l-none"
                            noAnimation
                            isLoading={isArticlePublishing}
                            disabled={!articleId || isArticlePublishing || (isPublished && !hasPendingChanges)}
                            onClick={onPrimaryAction}
                        />
                        <div className="relative">
                            <div ref={menuRef}>
                                <Button
                                    icon="i-lucide-chevron-down"
                                    size="sm"
                                    disabled={!articleId}
                                    noAnimation
                                    className="ltr:rounded-l-none rtl:rounded-r-none"
                                    onClick={event => {
                                        event.stopPropagation();
                                        setShowArticleActionMenu(open => !open);
                                    }}
                                />
                                {showArticleActionMenu ? (
                                    <DropdownMenu
                                        menuItems={articleMenuItems}
                                        className="mt-2 ltr:right-0 rtl:left-0 top-full"
                                        onAction={item => {
                                            setShowArticleActionMenu(false);
                                            // Không giải quyết nháp khi bản lưu tự động còn đang bay —
                                            // nó có thể đáp sau và dựng lại bản nháp vừa bỏ.
                                            if (blockedWhileSaving()) return;
                                            if (item.action === 'discard-draft') void discardDraftChanges();
                                            else updateArticleStatus(String(item.value));
                                        }}
                                    />
                                ) : null}
                            </div>
                        </div>
                    </ButtonGroup>
                    <ArticlePendingChangesPopover
                        ref={pendingChangesPopoverRef}
                        articleId={articleId}
                        portalSlug={portalSlug}
                        onResolved={statusCode => useAlert(statusMessage(statusCode, true))}
                        onFailed={error =>
                            useAlert(
                                parseApiErrorMessage(error) ||
                                    t('HELP_CENTER.EDIT_ARTICLE_PAGE.HEADER.PUBLISH_CHANGES_ERROR'),
                            )
                        }
                    />
                </div>
            </div>
        </div>
    );
}
