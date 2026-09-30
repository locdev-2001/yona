import { Link } from '@inertiajs/react';

import { t } from '../../../../../i18n';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import UnsavedChangesActions from '../../settingsDraft/UnsavedChangesActions';

interface BuilderHeaderProps {
    accountId: number;
    inboxId: number;
    inboxName: string;
    isDirty: boolean;
    isSaving: boolean;
    onCancel: () => void;
    onSave: () => void;
}

// Đầu trang: breadcrumb về đúng hộp thư, tiêu đề, và trạng thái lưu — một nút
// "Lưu thay đổi" duy nhất cho toàn bộ bản nháp (mọi thẻ bên dưới cùng gửi vào
// đây), không có nút lưu riêng theo từng thẻ.
export default function BuilderHeader({
    accountId,
    inboxId,
    inboxName,
    isDirty,
    isSaving,
    onCancel,
    onSave,
}: BuilderHeaderProps) {
    return (
        <header className="flex flex-col gap-2 px-4 sm:px-6 py-4 border-b border-n-weak bg-n-surface-1 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <nav aria-label={t('WIDGET_BUILDER.HEADER.BREADCRUMB_ARIA_LABEL')} className="flex items-center gap-1.5 text-label-small text-n-slate-11">
                        <Link href={accountScopedUrl(accountId, 'settings/general')} className="hover:underline">
                            {t('WIDGET_BUILDER.HEADER.BREADCRUMB_SETTINGS')}
                        </Link>
                        <span aria-hidden="true">/</span>
                        <Link href={accountScopedUrl(accountId, 'settings/inboxes/list')} className="hover:underline">
                            {t('WIDGET_BUILDER.HEADER.BREADCRUMB_INBOXES')}
                        </Link>
                        <span aria-hidden="true">/</span>
                        <Link href={accountScopedUrl(accountId, `settings/inboxes/${inboxId}`)} className="hover:underline truncate">
                            {inboxName}
                        </Link>
                    </nav>
                    <h1 className="mt-0.5 text-heading-1 text-n-slate-12">{t('WIDGET_BUILDER.HEADER.TITLE')}</h1>
                </div>
                <UnsavedChangesActions isDirty={isDirty} isSaving={isSaving} onCancel={onCancel} onSave={onSave} />
            </div>
        </header>
    );
}
