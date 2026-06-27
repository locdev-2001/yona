import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslator } from '@/lib/i18n';
import type { Project, ProjectMilestone } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

interface Props {
    project: Project;
    canManage: boolean;
}

export default function MilestoneKanban({ project, canManage }: Props) {
    const t = useTranslator();
    const [showForm, setShowForm] = useState(false);
    // optimistic local order for drag feedback
    const [localOrder, setLocalOrder] = useState<ProjectMilestone[]>(project.milestones ?? []);
    const dragId = useRef<string | null>(null);

    const { data, setData, post, processing, reset } = useForm({
        name: '',
        color: '#6366f1',
        due_date: '',
        description: '',
    });

    // Sync when Inertia refreshes props
    const milestones = project.milestones ?? [];
    // ponytail: if prop list length differs from local (new add/delete), reset local order
    if (milestones.length !== localOrder.length || milestones.some((m, i) => m.id !== localOrder[i]?.id)) {
        // only sync on structural change (add/delete), not during drag
        if (dragId.current === null) {
            setLocalOrder(milestones);
        }
    }

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

    // ── Drag handlers ──────────────────────────────────────────────────────────

    function handleDragStart(e: React.DragEvent, milestoneId: string) {
        dragId.current = milestoneId;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('milestoneId', milestoneId);
    }

    function handleDragOver(e: React.DragEvent, targetId: string) {
        e.preventDefault();
        if (!dragId.current || dragId.current === targetId) return;

        // Reorder optimistically
        setLocalOrder((prev) => {
            const fromIdx = prev.findIndex((m) => m.id === dragId.current);
            const toIdx = prev.findIndex((m) => m.id === targetId);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const next = [...prev];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            return next;
        });
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        dragId.current = null;

        const ordered_ids = localOrder.map((m) => m.id);
        router.post(
            route('projects.milestones.reorder', project.id),
            { ordered_ids },
            {
                preserveScroll: true,
                onError: () => {
                    // revert to server order on failure
                    setLocalOrder(project.milestones ?? []);
                },
            },
        );
    }

    function handleDragEnd() {
        dragId.current = null;
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
                {localOrder.map((m) => (
                    <MilestoneCard
                        key={m.id}
                        milestone={m}
                        projectId={project.id}
                        canManage={canManage}
                        onDelete={handleDelete}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onDragEnd={handleDragEnd}
                    />
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
                            {t('platform.actions.cancel') ?? 'Cancel'}
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
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: {
    milestone: ProjectMilestone;
    projectId: string;
    canManage: boolean;
    onDelete: (id: string) => void;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragOver: (e: React.DragEvent, id: string) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragEnd: () => void;
}) {
    return (
        <div
            draggable={canManage}
            onDragStart={(e) => onDragStart(e, milestone.id)}
            onDragOver={(e) => onDragOver(e, milestone.id)}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            className="relative flex h-24 w-48 flex-col justify-between rounded-lg border p-3 shadow-sm transition-opacity [&[data-dragging]]:opacity-50"
            style={milestone.color ? { borderLeftColor: milestone.color, borderLeftWidth: 4 } : {}}
        >
            <div className="flex items-start justify-between gap-1">
                <div className="flex min-w-0 items-start gap-1">
                    {canManage && <GripVertical className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab" />}
                    <span className="line-clamp-2 text-sm leading-tight font-medium">{milestone.name}</span>
                </div>
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
