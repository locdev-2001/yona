import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useTranslator } from '@/lib/i18n';
import type { Task } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Props {
    task?: Task;
    onSuccess?: () => void;
    submitRoute: string;
    method?: 'post' | 'patch';
}

type TaskFormData = {
    name: string;
    description: string;
    priority: string;
    status: string;
    start_date: string;
    due_date: string;
    related_type: string;
    related_id: string;
    billable: boolean;
    hourly_rate: string;
    visible_to_customer: boolean;
    lock_version: number;
};

export default function TaskForm({ task, onSuccess, submitRoute, method = 'post' }: Props) {
    const t = useTranslator();

    const { data, setData, post, patch, processing, errors, reset } = useForm<TaskFormData>({
        name: task?.name ?? '',
        description: task?.description ?? '',
        priority: String(task?.priority ?? 2),
        status: String(task?.status ?? 1),
        start_date: task?.start_date ?? '',
        due_date: task?.due_date ?? '',
        related_type: task?.related_type ?? '',
        related_id: task?.related_id ?? '',
        billable: task?.billable ?? false,
        hourly_rate: task?.hourly_rate ?? '',
        visible_to_customer: task?.visible_to_customer ?? false,
        lock_version: task?.lock_version ?? 0,
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        const submit = method === 'patch' ? patch : post;
        submit(submitRoute, { onSuccess });
    }

    const PRIORITIES: { value: string; label: string }[] = [
        { value: '1', label: t('tasks.priority.low') ?? 'Low' },
        { value: '2', label: t('tasks.priority.medium') ?? 'Medium' },
        { value: '3', label: t('tasks.priority.high') ?? 'High' },
        { value: '4', label: t('tasks.priority.urgent') ?? 'Urgent' },
    ];

    const RELATED_TYPES: { value: string; label: string }[] = [
        { value: '', label: t('tasks.related_type.standalone') ?? 'Standalone' },
        { value: 'lead', label: t('tasks.related_type.lead') ?? 'Lead' },
        { value: 'client', label: t('tasks.related_type.client') ?? 'Client' },
        { value: 'project', label: t('tasks.related_type.project') ?? 'Project' },
        { value: 'contact', label: t('tasks.related_type.contact') ?? 'Contact' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label htmlFor="name">{t('tasks.fields.name')}</Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                <InputError message={errors.name} />
            </div>

            <div>
                <Label htmlFor="description">{t('tasks.fields.description')}</Label>
                <Textarea id="description" value={data.description} onChange={(e) => setData('description', e.target.value)} rows={3} />
                <InputError message={errors.description} />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label>{t('tasks.fields.priority')}</Label>
                    <Select value={data.priority} onValueChange={(v) => setData('priority', v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {PRIORITIES.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.priority} />
                </div>

                <div>
                    <Label>{t('tasks.fields.related_to')}</Label>
                    <Select value={data.related_type} onValueChange={(v) => setData('related_type', v)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {RELATED_TYPES.map((rt) => (
                                <SelectItem key={rt.value} value={rt.value}>
                                    {rt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="start_date">{t('tasks.fields.start_date')}</Label>
                    <Input id="start_date" type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                    <InputError message={errors.start_date} />
                </div>
                <div>
                    <Label htmlFor="due_date">{t('tasks.fields.due_date')}</Label>
                    <Input id="due_date" type="date" value={data.due_date} onChange={(e) => setData('due_date', e.target.value)} />
                    <InputError message={errors.due_date} />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Switch id="billable" checked={data.billable} onCheckedChange={(v) => setData('billable', v)} />
                    <Label htmlFor="billable">{t('tasks.fields.billable')}</Label>
                </div>

                <div className="flex items-center gap-2">
                    <Switch id="visible_to_customer" checked={data.visible_to_customer} onCheckedChange={(v) => setData('visible_to_customer', v)} />
                    <Label htmlFor="visible_to_customer">{t('tasks.fields.visible_to_customer')}</Label>
                </div>
            </div>

            {data.billable && (
                <div>
                    <Label htmlFor="hourly_rate">{t('tasks.fields.hourly_rate')}</Label>
                    <Input
                        id="hourly_rate"
                        type="number"
                        step="0.01"
                        value={data.hourly_rate}
                        onChange={(e) => setData('hourly_rate', e.target.value)}
                    />
                    <InputError message={errors.hourly_rate} />
                </div>
            )}

            <div className="flex justify-end gap-2">
                <Button type="submit" disabled={processing}>
                    {task ? t('tasks.actions.edit') : t('tasks.actions.create')}
                </Button>
            </div>
        </form>
    );
}
