import { PageHeader } from '@/components/page-header';
import ProjectForm from '@/components/projects/project-form';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Client, Project, ProjectStatus, User } from '@/types';
import { Head } from '@inertiajs/react';
import type { CustomFieldDefinition } from '@modules/shared/resources/js/components/custom-fields/types';

interface Props {
    project: Project;
    clients: Pick<Client, 'id' | 'name'>[];
    statuses: ProjectStatus[];
    members: Pick<User, 'id' | 'name'>[];
    fieldDefs: CustomFieldDefinition[];
}

export default function ProjectEdit({ project, clients, statuses, members, fieldDefs }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('projects.title.index') ?? 'Projects', href: route('projects.index') },
        { title: project.name, href: route('projects.show', project.id) },
        { title: t('projects.title.edit') ?? 'Edit', href: route('projects.edit', project.id) },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${t('projects.title.edit')} — ${project.name}`} />

            <div className="mx-auto max-w-3xl p-4 md:p-6">
                <PageHeader title={`${t('projects.title.edit')}: ${project.name}`} className="mb-6" />
                <ProjectForm
                    project={project}
                    clients={clients}
                    statuses={statuses}
                    members={members}
                    fieldDefs={fieldDefs}
                    submitRoute={route('projects.update', project.id)}
                    method="patch"
                />
            </div>
        </AppLayout>
    );
}
