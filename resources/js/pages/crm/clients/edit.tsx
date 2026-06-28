import ClientForm from '@/components/clients/client-form';
import { PageHeader } from '@/components/page-header';
import type { CustomFieldDefinition } from '@/components/shared/custom-fields/types';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Client, ClientGroup } from '@/types';
import { Head } from '@inertiajs/react';

interface Props {
    client: Client;
    groups: ClientGroup[];
    clientFieldDefs: CustomFieldDefinition[];
}

export default function ClientEdit({ client, groups, clientFieldDefs }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('clients.title.index') ?? 'Clients', href: route('clients.index') },
        { title: client.name, href: route('clients.show', { client: client.id }) },
        { title: t('clients.title.edit') ?? 'Edit', href: route('clients.edit', { client: client.id }) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('clients.title.edit')} — ${client.name}`} />

            <div className="mx-auto max-w-3xl p-4 md:p-6">
                <PageHeader title={`${t('clients.title.edit') ?? 'Edit'}: ${client.name}`} className="mb-6" />

                <ClientForm
                    client={client}
                    groups={groups}
                    clientFieldDefs={clientFieldDefs}
                    submitRoute={route('clients.update', { client: client.id })}
                    method="put"
                />
            </div>
        </AppLayout>
    );
}
