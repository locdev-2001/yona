import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { articleUiFlags, discardArticleDraft, publishArticleDraft, useHelpCenterState } from '../store';
import type { DashboardPageProps } from '../../types';

// Port từ components-next/HelpCenter/Pages/ArticleEditorPage/ArticlePendingChangesPopover.vue.
export interface PendingChangesPopoverHandle {
    open: (status?: number) => void;
    close: () => void;
}

interface ArticlePendingChangesPopoverProps {
    articleId: number;
    portalSlug: string;
    onResolved: (status?: number) => void;
    onFailed: (error: unknown) => void;
}

const ArticlePendingChangesPopover = forwardRef<PendingChangesPopoverHandle, ArticlePendingChangesPopoverProps>(
    function ArticlePendingChangesPopover({ articleId, portalSlug, onResolved, onFailed }, ref) {
        const { currentAccount } = usePage<DashboardPageProps>().props;
        const accountId = currentAccount.id;

        const [isOpen, setOpen] = useState(false);
        const [requestedStatus, setRequestedStatus] = useState<number | undefined>();
        const [activeAction, setActiveAction] = useState<'apply' | 'discard' | null>(null);
        const containerRef = useRef<HTMLDivElement>(null);

        useHelpCenterState();
        const isLoading = Boolean(articleUiFlags(articleId).isUpdating);

        const close = () => setOpen(false);

        useClickAway(containerRef, () => {
            if (!isLoading) close();
        }, isOpen);

        useImperativeHandle(ref, () => ({
            open: (status?: number) => {
                setRequestedStatus(status);
                setActiveAction(null);
                setOpen(true);
            },
            close,
        }));

        const resolve = async (action: 'publishDraft' | 'discardDraft') => {
            setActiveAction(action === 'publishDraft' ? 'apply' : 'discard');
            try {
                const resolver = action === 'publishDraft' ? publishArticleDraft : discardArticleDraft;
                await resolver(accountId, portalSlug, articleId, requestedStatus);
                onResolved(requestedStatus);
                close();
            } catch (error) {
                onFailed(error);
            }
        };

        return (
            <div
                ref={containerRef}
                style={{ display: isOpen ? undefined : 'none' }}
                className="overlay-surface absolute z-50 flex flex-col gap-4 p-4 mt-2 w-96 end-0 top-full rounded-xl"
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-base font-medium text-n-slate-12">
                            {t('HELP_CENTER.EDIT_ARTICLE_PAGE.PENDING_CHANGES_POPOVER.TITLE')}
                        </h3>
                        <p className="mb-0 text-sm text-n-slate-11">
                            {t('HELP_CENTER.EDIT_ARTICLE_PAGE.PENDING_CHANGES_POPOVER.DESCRIPTION')}
                        </p>
                    </div>
                    <Button
                        icon="i-lucide-x"
                        variant="ghost"
                        color="slate"
                        size="xs"
                        className="shrink-0 -me-1 -mt-1"
                        disabled={isLoading}
                        onClick={close}
                    />
                </div>
                <div className="flex items-center justify-between gap-2">
                    <Button
                        type="button"
                        variant="faded"
                        color="ruby"
                        size="sm"
                        className="flex-1"
                        isLoading={isLoading && activeAction === 'discard'}
                        disabled={isLoading}
                        label={t('HELP_CENTER.EDIT_ARTICLE_PAGE.PENDING_CHANGES_POPOVER.DISCARD')}
                        onClick={() => resolve('discardDraft')}
                    />
                    <Button
                        type="button"
                        color="blue"
                        size="sm"
                        className="flex-1"
                        isLoading={isLoading && activeAction === 'apply'}
                        disabled={isLoading}
                        label={t('HELP_CENTER.EDIT_ARTICLE_PAGE.PENDING_CHANGES_POPOVER.APPLY')}
                        onClick={() => resolve('publishDraft')}
                    />
                </div>
            </div>
        );
    },
);

export default ArticlePendingChangesPopover;
