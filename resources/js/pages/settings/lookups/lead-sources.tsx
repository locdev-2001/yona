import HeadingSmall from '@/components/heading-small';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import LookupTable, { type LookupItem } from './_lookup-table';

interface Props {
    sources: LookupItem[];
}

export default function LeadSourcesSettings({ sources }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('lookups.lead_sources.title'), href: '/settings/lookups/lead-sources' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('lookups.lead_sources.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title={t('lookups.lead_sources.title')} description={t('lookups.lead_sources.subtitle')} />

                    <LookupTable
                        items={sources}
                        storeRoute={route('lookups.lead-sources.store')}
                        updateRouteFn={(id) => route('lookups.lead-sources.update', id)}
                        deleteRouteFn={(id) => route('lookups.lead-sources.destroy', id)}
                        addLabel={t('lookups.lead_sources.add')}
                        emptyLabel={t('lookups.lead_sources.empty')}
                        showColor={false}
                    />
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
