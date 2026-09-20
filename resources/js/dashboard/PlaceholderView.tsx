import { router, usePage } from '@inertiajs/react';

import { t } from '../i18n';
import Button from 'dashboard/components-next/button/Button';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from './Dashboard';
import type { DashboardPageProps } from './types';

// Trang con chưa port — giữ đúng URL, nội dung dựng ở tính năng tương ứng (B→F).
// Người dùng cuối không cần biết slug route, nên chỉ nói trạng thái + lối ra.
// Lệch §4.5 app.md ở hai chỗ, có chủ đích:
//   - Không icon: route bắt theo `.*` nên không biết trang gì, mọi icon đều là
//     trang trí; ở cỡ đủ lớn để làm điểm neo thì nét lucide dày gấp đôi icon nav.
//   - Nút là `outline` chứ không `solid`: solid blue đo được 3.78:1, trượt WCAG AA.
// pb-12 kéo khối lên trên tâm hình học: căn đúng 50% trông như bị chìm.
export default function PlaceholderView() {
    const { currentAccount } = usePage<DashboardPageProps>().props;

    return (
        <Dashboard>
            <div className="flex flex-col items-center justify-center flex-1 px-6 pb-12 text-center">
                <h1 className="text-xl font-medium text-n-slate-12">
                    {t('APP_GLOBAL.PLACEHOLDER.TITLE')}
                </h1>
                <p className="max-w-md mt-2 text-sm text-pretty text-n-slate-11">
                    {t('APP_GLOBAL.PLACEHOLDER.DESCRIPTION')}
                </p>
                <Button
                    outline
                    blue
                    md
                    className="mt-6"
                    label={t('APP_GLOBAL.PLACEHOLDER.BACK')}
                    onClick={() => router.visit(accountScopedUrl(currentAccount.id, 'dashboard'))}
                />
            </div>
        </Dashboard>
    );
}
