import HeadingSmall from '@/components/heading-small';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import LookupTable, { type LookupItem } from './_lookup-table';

interface StatusItem extends LookupItem {
    status_order: number;
}

interface Props {
    statuses: StatusItem[];
}

export default function ProjectStatusesSettings({ statuses }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('lookups.project_statuses.title'), href: '/settings/lookups/project-statuses' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('lookups.project_statuses.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title={t('lookups.project_statuses.title')} description={t('lookups.project_statuses.subtitle')} />

                    <LookupTable
                        items={statuses}
                        storeRoute={route('lookups.project-statuses.store')}
                        updateRouteFn={(id) => route('lookups.project-statuses.update', id)}
                        deleteRouteFn={(id) => route('lookups.project-statuses.destroy', id)}
                        addLabel={t('lookups.project_statuses.add')}
                        emptyLabel={t('lookups.project_statuses.empty')}
                        showColor={true}
                    />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
