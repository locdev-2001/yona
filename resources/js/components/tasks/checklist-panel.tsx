import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useTranslator } from '@/lib/i18n';
import type { Task, TaskChecklistItem } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
    task: Task;
    canUpdate: boolean;
}

export default function ChecklistPanel({ task, canUpdate }: Props) {
    const t = useTranslator();

    const { data, setData, post, processing, reset } = useForm({
        description: '',
        assigned_user_id: null as number | null,
    });

    const items: TaskChecklistItem[] = task.checklist_items ?? [];
    const doneCount = items.filter((i) => i.finished).length;

    function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!data.description.trim()) return;

        post(route('tasks.checklist.store', { task: task.id }), {
            onSuccess: () => reset(),
        });
    }

    function handleToggle(item: TaskChecklistItem) {
        router.patch(route('tasks.checklist.toggle', { task: task.id, item: item.id }));
    }

    function handleDelete(item: TaskChecklistItem) {
        router.delete(route('tasks.checklist.destroy', { task: task.id, item: item.id }));
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t('tasks.title.checklist')}</h3>
                {items.length > 0 && (
                    <span className="text-muted-foreground text-xs">
                        {doneCount}/{items.length}
                    </span>
                )}
            </div>

            {items.length > 0 && (
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%` }}
                    />
                </div>
            )}

            <div className="space-y-1">
                {items.map((item) => (
                    <div key={item.id} className="hover:bg-muted/40 flex items-center gap-2 rounded px-1 py-1">
                        <Checkbox checked={item.finished} onCheckedChange={() => canUpdate && handleToggle(item)} disabled={!canUpdate} />
                        <span className={`flex-1 text-sm ${item.finished ? 'text-muted-foreground line-through' : ''}`}>{item.description}</span>
                        {canUpdate && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(item)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}

                {items.length === 0 && <p className="text-muted-foreground text-xs">{t('tasks.checklist.empty')}</p>}
            </div>

            {canUpdate && (
                <form onSubmit={handleAdd} className="flex gap-2">
                    <Input
                        placeholder={t('tasks.checklist.placeholder') ?? 'Add item...'}
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        className="h-8 text-sm"
                    />
                    <Button type="submit" size="sm" disabled={processing}>
                        <Plus className="h-4 w-4" />
                    </Button>
                </form>
            )}
        </div>
    );
}
