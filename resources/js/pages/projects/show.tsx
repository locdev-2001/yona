import { PageHeader } from '@/components/page-header';
import ActivityFeed from '@/components/projects/activity-feed';
import DiscussionThread from '@/components/projects/discussion-thread';
import FileList from '@/components/projects/file-list';
import MemberList from '@/components/projects/member-list';
import MilestoneKanban from '@/components/projects/milestone-kanban';
import ProgressCircle from '@/components/projects/progress-circle';
import StatusBadge from '@/components/projects/status-badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem, Project, ProjectStatus, User } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Calendar, Edit, Pin, Trash2 } from 'lucide-react';

interface Props {
    project: Project;
    statuses: ProjectStatus[];
    fieldDefs: unknown[];
    workspaceMembers?: Pick<User, 'id' | 'name'>[];
    can: { update: boolean; delete: boolean; manageMembers: boolean };
}

export default function ProjectShow({ project, statuses, can, workspaceMembers = [] }: Props) {
    const t = useTranslator();

    const breadcrumbs: BreadcrumbItem[] = [
        { title: t('projects.title.index') ?? 'Projects', href: route('projects.index') },
        { title: project.name, href: route('projects.show', project.id) },
    ];

    function handleStatusChange(statusId: string) {
        router.patch(route('projects.status', project.id), { status_id: statusId }, { preserveScroll: true });
    }

    function handleDelete() {
        if (confirm('Delete this project?')) {
            router.delete(route('projects.destroy', project.id));
        }
    }

    function handlePin() {
        router.patch(route('projects.pin', project.id), {}, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={project.name} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <PageHeader title={`${project.name} #${project.project_number}`} description={project.client?.name ?? ''} />
                        {project.is_pinned && <Pin className="mt-1 h-4 w-4 text-amber-500" />}
                    </div>

                    <div className="flex gap-2">
                        {can.update && (
                            <>
                                <Button size="sm" variant="outline" onClick={handlePin}>
                                    <Pin className="mr-1 h-4 w-4" />
                                    {project.is_pinned ? t('projects.actions.unpin') : t('projects.actions.pin')}
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={route('projects.edit', project.id)}>
                                        <Edit className="mr-1 h-4 w-4" />
                                        {t('projects.actions.edit')}
                                    </Link>
                                </Button>
                            </>
                        )}
                        {can.delete && (
                            <Button size="sm" variant="destructive" onClick={handleDelete}>
                                <Trash2 className="mr-1 h-4 w-4" />
                                {t('projects.actions.delete')}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Overview bar */}
                <div className="flex flex-wrap items-center gap-6 rounded-lg border p-4">
                    <ProgressCircle progress={project.progress} size={56} />

                    <div className="space-y-1">
                        <p className="text-muted-foreground text-xs">{t('projects.fields.status')}</p>
                        {can.update ? (
                            <Select value={project.status_id ?? ''} onValueChange={handleStatusChange}>
                                <SelectTrigger className="h-7 w-36 text-xs">
                                    <SelectValue placeholder="—" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statuses.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <StatusBadge status={project.status} />
                        )}
                    </div>

                    {project.owner && (
                        <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">{t('projects.fields.owner')}</p>
                            <p className="text-sm font-medium">{project.owner.name}</p>
                        </div>
                    )}

                    {project.deadline && (
                        <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">{t('projects.fields.deadline')}</p>
                            <div className="flex items-center gap-1 text-sm">
                                <Calendar className="text-muted-foreground h-3.5 w-3.5" />
                                {new Date(project.deadline).toLocaleDateString()}
                            </div>
                        </div>
                    )}

                    {project.start_date && (
                        <div className="space-y-1">
                            <p className="text-muted-foreground text-xs">{t('projects.fields.start_date')}</p>
                            <p className="text-sm">{new Date(project.start_date).toLocaleDateString()}</p>
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">{t('projects.tabs.overview')}</TabsTrigger>
                        <TabsTrigger value="members">{t('projects.tabs.members')}</TabsTrigger>
                        <TabsTrigger value="milestones">{t('projects.tabs.milestones')}</TabsTrigger>
                        <TabsTrigger value="files">{t('projects.tabs.files')}</TabsTrigger>
                        <TabsTrigger value="discussions">{t('projects.tabs.discussions')}</TabsTrigger>
                        <TabsTrigger value="activity">{t('projects.tabs.activity')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="pt-4">
                        {project.description && <p className="text-muted-foreground text-sm whitespace-pre-line">{project.description}</p>}
                        {!project.description && <p className="text-muted-foreground text-sm">No description.</p>}
                    </TabsContent>

                    <TabsContent value="members" className="pt-4">
                        <MemberList project={project} workspaceMembers={workspaceMembers} canManage={can.manageMembers} />
                    </TabsContent>

                    <TabsContent value="milestones" className="pt-4">
                        <MilestoneKanban project={project} canManage={can.update} />
                    </TabsContent>

                    <TabsContent value="files" className="pt-4">
                        <FileList project={project} canManage={can.update} />
                    </TabsContent>

                    <TabsContent value="discussions" className="pt-4">
                        <DiscussionThread project={project} canComment={true} />
                    </TabsContent>

                    <TabsContent value="activity" className="pt-4">
                        <ActivityFeed activities={project.activities ?? []} />
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    );
}
