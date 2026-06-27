import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Lead, LeadSource, Pipeline, PipelineStage, User } from '@/types';
import { Head } from '@inertiajs/react';
import type { CustomFieldDefinition } from '@modules/shared/resources/js/components/custom-fields/types';
import LeadForm from './components/lead-form';

interface Props {
    lead: Lead;
    pipelines: (Pipeline & { stages: PipelineStage[] })[];
    sources: LeadSource[];
    members: Pick<User, 'id' | 'name'>[];
    fieldDefs: CustomFieldDefinition[];
}

export default function LeadEdit({ lead, pipelines, sources, members, fieldDefs }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('leads.title.index') ?? 'Leads', href: route('leads.index') },
        { title: lead.name, href: route('leads.show', lead.id) },
        { title: t('leads.title.edit') ?? 'Edit', href: route('leads.edit', lead.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('leads.title.edit') ?? 'Edit Lead'} />

            <div className="mx-auto max-w-3xl p-4 md:p-6">
                <PageHeader title={t('leads.title.edit') ?? 'Edit Lead'} className="mb-6" />

                <LeadForm
                    lead={lead}
                    pipelines={pipelines}
                    sources={sources}
                    members={members}
                    fieldDefs={fieldDefs}
                    submitRoute={route('leads.update', lead.id)}
                    method="patch"
                />
            </div>
        </AppLayout>
    );
}
