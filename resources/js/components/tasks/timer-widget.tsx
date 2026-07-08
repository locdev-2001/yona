import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslator } from '@/lib/i18n';
import type { Task, TaskTimer } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Play, Square, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    task: Task;
    canLogTime: boolean;
}

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function TimerWidget({ task, canLogTime }: Props) {
    const t = useTranslator();
    const timers: TaskTimer[] = task.timers ?? [];
    const runningTimer = timers.find((t) => t.end_time === null);

    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (!runningTimer) {
            setElapsed(0);

            return;
        }

        const startedAt = new Date(runningTimer.start_time).getTime();

        function tick() {
            setElapsed(Math.floor((Date.now() - startedAt) / 1000));
        }

        tick();
        const id = setInterval(tick, 1000);

        return () => clearInterval(id);
    }, [runningTimer?.id]);

    const { data, setData, post, processing, reset } = useForm({
        start_time: '',
        end_time: '',
        note: '',
    });

    function handleStart() {
        router.post(route('tasks.timers.start', { task: task.id }));
    }

    function handleStop() {
        if (!runningTimer) return;
        router.patch(route('tasks.timers.stop', { task: task.id, timer: runningTimer.id }));
    }

    function handleLogManual(e: React.FormEvent) {
        e.preventDefault();
        post(route('tasks.timers.log', { task: task.id }), {
            onSuccess: () => reset(),
        });
    }

    function handleDelete(timer: TaskTimer) {
        router.delete(route('tasks.timers.destroy', { task: task.id, timer: timer.id }));
    }

    const isBilled = task.billed;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t('tasks.timer.title')}</h3>
                {canLogTime && !isBilled && (
                    <div className="flex items-center gap-2">
                        {runningTimer ? (
                            <>
                                <span className="font-mono text-sm text-green-600">{formatDuration(elapsed)}</span>
                                <Button size="sm" variant="outline" onClick={handleStop}>
                                    <Square className="mr-1 h-3 w-3" />
                                    {t('tasks.actions.stop_timer')}
                                </Button>
                            </>
                        ) : (
                            <Button size="sm" onClick={handleStart}>
                                <Play className="mr-1 h-3 w-3" />
                                {t('tasks.actions.start_timer')}
                            </Button>
                        )}
                    </div>
                )}
                {isBilled && <span className="text-muted-foreground text-xs">{t('tasks.timer.billed_locked')}</span>}
            </div>

            {/* Timer entries */}
            <div className="space-y-1">
                {timers.length === 0 && <p className="text-muted-foreground text-xs">{t('tasks.timer.empty')}</p>}
                {timers.map((timer) => (
                    <div key={timer.id} className="hover:bg-muted/40 flex items-center gap-2 rounded px-1 py-1 text-sm">
                        <span className="text-muted-foreground">{timer.user?.name}</span>
                        <span className="flex-1 font-mono text-xs">{formatDuration(timer.duration_seconds)}</span>
                        {timer.end_time === null && (
                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">{t('tasks.timer.running')}</span>
                        )}
                        {!isBilled && (
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(timer)}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {/* Manual log form */}
            {canLogTime && !isBilled && (
                <details className="text-sm">
                    <summary className="text-muted-foreground hover:text-foreground cursor-pointer">{t('tasks.timer.manual_entry')}</summary>
                    <form onSubmit={handleLogManual} className="mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-xs">{t('tasks.fields.start_time')}</Label>
                                <Input
                                    type="datetime-local"
                                    value={data.start_time}
                                    onChange={(e) => setData('start_time', e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">{t('tasks.fields.end_time')}</Label>
                                <Input
                                    type="datetime-local"
                                    value={data.end_time}
                                    onChange={(e) => setData('end_time', e.target.value)}
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>
                        <Input
                            placeholder={t('tasks.fields.note') ?? 'Note'}
                            value={data.note}
                            onChange={(e) => setData('note', e.target.value)}
                            className="h-8 text-xs"
                        />
                        <Button type="submit" size="sm" disabled={processing} className="w-full">
                            {t('tasks.actions.log_time')}
                        </Button>
                    </form>
                </details>
            )}
        </div>
    );
}
