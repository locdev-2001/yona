import { PageHeader } from '@/components/page-header';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, LeadSource, Pipeline, PipelineStage, User } from '@/types';
import { Head } from '@inertiajs/react';
import type { CustomFieldDefinition } from '@modules/shared/resources/js/components/custom-fields/types';
import LeadForm from './components/lead-form';

interface Props {
    pipelines: (Pipeline & { stages: PipelineStage[] })[];
    sources: LeadSource[];
    members: Pick<User, 'id' | 'name'>[];
    fieldDefs: CustomFieldDefinition[];
}

export default function LeadCreate({ pipelines, sources, members, fieldDefs }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('leads.title.index') ?? 'Leads', href: route('leads.index') },
        { title: t('leads.title.create') ?? 'Add Lead', href: route('leads.create') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('leads.title.create') ?? 'Add Lead'} />

            <div className="mx-auto max-w-3xl p-4 md:p-6">
                <PageHeader title={t('leads.title.create') ?? 'Add Lead'} className="mb-6" />

                <LeadForm
                    pipelines={pipelines}
                    sources={sources}
                    members={members}
                    fieldDefs={fieldDefs}
                    submitRoute={route('leads.store')}
                    method="post"
                />
            </div>
        </AppLayout>
    );
}
