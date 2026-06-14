import AdminLayout from '@/layouts/admin/layout';
import { useTranslator } from '@/lib/i18n';
import { Head } from '@inertiajs/react';

export default function AdminDashboard() {
    const t = useTranslator();

    return (
        <AdminLayout breadcrumbs={[{ title: t('platform.admin.nav.dashboard'), href: '/admin/dashboard' }]}>
            <Head title={t('platform.admin.dashboard.title')} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div>
                    <h1 className="text-2xl font-semibold">{t('platform.admin.dashboard.title')}</h1>
                    <p className="text-muted-foreground mt-1 text-sm">{t('platform.admin.dashboard.subtitle')}</p>
                </div>
            </div>
        </AdminLayout>
    );
}
