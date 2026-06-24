import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslator } from '@/lib/i18n';
import type { Project, ProjectMilestone } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    project: Project;
    canManage: boolean;
}

export default function MilestoneKanban({ project, canManage }: Props) {
    const t = useTranslator();
    const milestones = project.milestones ?? [];
    const [showForm, setShowForm] = useState(false);

    const { data, setData, post, processing, reset } = useForm({
        name: '',
        color: '#6366f1',
        due_date: '',
        description: '',
    });

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        post(route('projects.milestones.store', project.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setShowForm(false);
            },
        });
    }

    function handleDelete(milestoneId: string) {
        router.delete(route('projects.milestones.destroy', { project: project.id, milestone: milestoneId }), {
            preserveScroll: true,
        });
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                {milestones.map((m) => (
                    <MilestoneCard key={m.id} milestone={m} projectId={project.id} canManage={canManage} onDelete={handleDelete} />
                ))}

                {canManage && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary flex h-24 w-48 flex-col items-center justify-center rounded-lg border-2 border-dashed text-sm transition"
                    >
                        <Plus className="mb-1 h-5 w-5" />
                        {t('projects.actions.add_milestone')}
                    </button>
                )}
            </div>

            {showForm && (
                <form onSubmit={handleCreate} className="max-w-sm space-y-3 rounded-lg border p-4">
                    <div className="space-y-1">
                        <Label htmlFor="ms-name">{t('projects.milestone.name')}</Label>
                        <Input id="ms-name" value={data.name} onChange={(e) => setData('name', e.target.value)} required maxLength={191} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="ms-color">{t('projects.milestone.color')}</Label>
                            <Input
                                id="ms-color"
                                type="color"
                                value={data.color}
                                onChange={(e) => setData('color', e.target.value)}
                                className="h-9 px-1"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="ms-due">{t('projects.milestone.due_date')}</Label>
                            <Input id="ms-due" type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)} />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={processing}>
                            {t('projects.actions.add_milestone')}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            )}
        </div>
    );
}

function MilestoneCard({
    milestone,
    projectId,
    canManage,
    onDelete,
}: {
    milestone: ProjectMilestone;
    projectId: string;
    canManage: boolean;
    onDelete: (id: string) => void;
}) {
    return (
        <div
            className="relative flex h-24 w-48 flex-col justify-between rounded-lg border p-3 shadow-sm"
            style={milestone.color ? { borderLeftColor: milestone.color, borderLeftWidth: 4 } : {}}
        >
            <div className="flex items-start justify-between gap-1">
                <span className="line-clamp-2 text-sm leading-tight font-medium">{milestone.name}</span>
                {canManage && (
                    <button onClick={() => onDelete(milestone.id)} className="text-destructive shrink-0 opacity-50 hover:opacity-100">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
            {milestone.due_date && <span className="text-muted-foreground text-xs">{new Date(milestone.due_date).toLocaleDateString()}</span>}
        </div>
    );
}
