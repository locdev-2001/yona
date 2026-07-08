import { ChartAreaMock } from '@/components/dashboard/chart-area-mock';
import { DataTableMock } from '@/components/dashboard/data-table-mock';
import { SectionCards } from '@/components/dashboard/section-cards';
import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

export default function Dashboard() {
    const t = useTranslator();
    const breadcrumbs: BreadcrumbItem[] = [{ title: t('platform.nav.dashboard'), href: '/dashboard' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('platform.dashboard.title')} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader title={t('platform.dashboard.title')} description={t('platform.dashboard.description')} />
                <SectionCards />
                <ChartAreaMock />
                <DataTableMock />
            </div>
        </AppLayout>
    );
}
