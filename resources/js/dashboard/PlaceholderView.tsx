import { router, usePage } from '@inertiajs/react';

import { t } from '../i18n';
import Button from 'dashboard/components-next/button/Button';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from './Dashboard';
import type { DashboardPageProps } from './types';

// Trang con chưa port — giữ đúng URL, nội dung dựng ở tính năng tương ứng (B→F).
// Người dùng cuối không cần biết slug route, nên chỉ nói trạng thái + lối ra.
// pb-24 kéo khối lên trên tâm hình học: căn đúng 50% trông như bị chìm.
export default function PlaceholderView() {
    const { currentAccount } = usePage<DashboardPageProps>().props;

    return (
        <Dashboard>
            <div className="flex flex-col items-center justify-center flex-1 px-6 pb-12 text-center">
                <span className="mb-4 i-lucide-hard-hat size-12 text-n-slate-11" aria-hidden />
                <h1 className="text-xl font-medium text-n-slate-12">
                    {t('APP_GLOBAL.PLACEHOLDER.TITLE')}
                </h1>
                <p className="max-w-md mt-2 text-sm text-balance text-n-slate-11">
                    {t('APP_GLOBAL.PLACEHOLDER.DESCRIPTION')}
                </p>
                <Button
                    outline
                    blue
                    md
                    className="mt-6"
                    icon="i-lucide-arrow-left"
                    label={t('APP_GLOBAL.PLACEHOLDER.BACK')}
                    onClick={() => router.visit(accountScopedUrl(currentAccount.id, 'dashboard'))}
                />
            </div>
        </Dashboard>
    );
}
