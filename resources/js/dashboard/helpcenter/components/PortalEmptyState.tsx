import { useRef } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import EmptyStateLayout from 'dashboard/components-next/EmptyStateLayout';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import ArticleCard from './ArticleCard';
import CreatePortalDialog from './CreatePortalDialog';
import articleContent from '../helper/portalEmptyStateContent';

// Port từ components-next/HelpCenter/EmptyState/Portal/PortalEmptyState.vue.
// Bản gốc gọi `articleContent.reverse()` (đảo tại chỗ) cho cột phải.
const reversedContent = [...articleContent].reverse();

interface PortalEmptyStateProps {
    onPortalCreate: (payload: { slug: string; locale: string }) => void;
}

export default function PortalEmptyState({ onPortalCreate }: PortalEmptyStateProps) {
    const createPortalDialogRef = useRef<DialogHandle>(null);

    const renderColumn = (items: typeof articleContent, keyPrefix: string) => (
        <div className="space-y-4">
            {items.map((article, index) => (
                <ArticleCard
                    key={`${keyPrefix}-article-${index}`}
                    id={article.id}
                    title={article.title}
                    status={article.status}
                    updatedAt={article.updatedAt}
                    author={{ id: 0, name: '', availableName: article.author.availableName }}
                    category={article.category}
                    views={article.views}
                />
            ))}
        </div>
    );

    return (
        <EmptyStateLayout
            title={t('HELP_CENTER.TITLE')}
            subtitle={t('HELP_CENTER.NEW_PAGE.DESCRIPTION')}
            className="bg-n-surface-1"
            emptyStateItem={
                <div className="grid grid-cols-2 gap-4 p-px">
                    {renderColumn(articleContent, 'left')}
                    {renderColumn(reversedContent, 'right')}
                </div>
            }
            actions={
                <>
                    <Button
                        label={t('HELP_CENTER.NEW_PAGE.CREATE_PORTAL_BUTTON')}
                        icon="i-lucide-plus"
                        onClick={() => createPortalDialogRef.current?.open()}
                    />
                    <CreatePortalDialog ref={createPortalDialogRef} onCreated={onPortalCreate} />
                </>
            }
        />
    );
}
