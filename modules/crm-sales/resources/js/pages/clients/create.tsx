import ClientForm from '@/components/clients/client-form';
import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, ClientGroup } from '@/types';
import { Head } from '@inertiajs/react';
import type { CustomFieldDefinition } from '@modules/shared/resources/js/components/custom-fields/types';

interface Props {
    groups: ClientGroup[];
    clientFieldDefs: CustomFieldDefinition[];
    contactFieldDefs: CustomFieldDefinition[];
}

export default function ClientCreate({ groups, clientFieldDefs }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('clients.title.index') ?? 'Clients', href: route('clients.index') },
        { title: t('clients.title.create') ?? 'Add Client', href: route('clients.create') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('clients.title.create') ?? 'Add Client'} />

            <div className="mx-auto max-w-3xl p-4 md:p-6">
                <PageHeader title={t('clients.title.create') ?? 'Add Client'} className="mb-6" />

                <ClientForm groups={groups} clientFieldDefs={clientFieldDefs} submitRoute={route('clients.store')} method="post" />
            </div>
        </AppLayout>
    );
}
