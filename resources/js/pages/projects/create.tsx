import type { CustomFieldDefinition } from '@/components/custom-fields/types';
import { PageHeader } from '@/components/page-header';
import ProjectForm from '@/components/projects/project-form';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Client, ProjectStatus, Team } from '@/types';
import { Head } from '@inertiajs/react';

interface Props {
    clients: Pick<Client, 'id' | 'name'>[];
    statuses: ProjectStatus[];
    teams: Pick<Team, 'id' | 'name'>[];
    fieldDefs: CustomFieldDefinition[];
}

export default function ProjectCreate({ clients, statuses, teams, fieldDefs }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('projects.title.index') ?? 'Projects', href: route('projects.index') },
        { title: t('projects.title.create') ?? 'Create Project', href: route('projects.create') },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('projects.title.create') ?? 'Create Project'} />

            <div className="mx-auto max-w-3xl p-4 md:p-6">
                <PageHeader title={t('projects.title.create') ?? 'Create Project'} className="mb-6" />
                <ProjectForm
                    clients={clients}
                    statuses={statuses}
                    teams={teams}
                    fieldDefs={fieldDefs}
                    submitRoute={route('projects.store')}
                    method="post"
                />
            </div>
        </AppLayout>
    );
}
