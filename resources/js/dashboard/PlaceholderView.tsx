import { router, usePage } from '@inertiajs/react';

import { t } from '../i18n';
import Button from 'dashboard/components-next/button/Button';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import Dashboard from './Dashboard';
import type { DashboardPageProps } from './types';

interface PlaceholderPageProps extends DashboardPageProps {
    view: string;
}

// Các mục sidebar còn trỏ vào route bắt-tất (routes/web.php, `/{view}` where `.*`).
// Gọi đúng tên mục người dùng vừa bấm; dùng lại nhãn của sidebar nên không lệch chữ.
// Xoá dòng tương ứng khi tính năng được port.
const VIEW_LABEL_KEYS: Record<string, string> = {
    'settings/templates': 'SIDEBAR.WHATSAPP_TEMPLATES',
    'settings/data/imports': 'SIDEBAR.DATA',
    'settings/security': 'SIDEBAR.SECURITY',
};

// Trang con chưa port — giữ đúng URL, nội dung dựng ở tính năng tương ứng (B→F).
// Người dùng cuối không cần biết slug route, nên chỉ nói tên mục + trạng thái + lối ra.
// Lệch §4.5 app.md có chủ đích:
//   - Không icon: route bắt theo `.*`, mọi icon đều là trang trí; ở cỡ đủ lớn để
//     làm điểm neo thì nét lucide dày gấp đôi icon nav.
//   - Nút `outline` chứ không `solid`: solid blue đo được 3.78:1, trượt WCAG AA.
// pb-12 kéo khối lên trên tâm hình học: căn đúng 50% trông như bị chìm.
export default function PlaceholderView() {
    const { currentAccount, view } = usePage<PlaceholderPageProps>().props;
    const labelKey = VIEW_LABEL_KEYS[view];
    const title = labelKey
        ? t('APP_GLOBAL.PLACEHOLDER.TITLE_NAMED', { name: t(labelKey) })
        : t('APP_GLOBAL.PLACEHOLDER.TITLE');

    return (
        <Dashboard>
            <div className="flex flex-col items-center justify-center flex-1 px-6 pb-12 text-center">
                <h1 className="text-xl font-medium text-n-slate-12">{title}</h1>
                <p className="max-w-md mt-3 text-sm text-pretty text-n-slate-11">
                    {t('APP_GLOBAL.PLACEHOLDER.DESCRIPTION')}
                </p>
                <Button
                    outline
                    blue
                    md
                    className="mt-8"
                    label={t('APP_GLOBAL.PLACEHOLDER.BACK')}
                    onClick={() => router.visit(accountScopedUrl(currentAccount.id, 'dashboard'))}
                />
            </div>
        </Dashboard>
    );
}
