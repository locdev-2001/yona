import { ChartAreaMock } from '@/components/dashboard/chart-area-mock';
import { DataTableMock } from '@/components/dashboard/data-table-mock';
import { SectionCards } from '@/components/dashboard/section-cards';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
                <SectionCards />
                <ChartAreaMock />
                <DataTableMock />
            </div>
        </AppLayout>
    );
}
