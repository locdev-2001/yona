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

type RecordOption = { id: string; name: string };
type MemberOption = { id: number; name: string };

interface Props {
    task?: Task;
    onSuccess?: () => void;
    submitRoute: string;
    method?: 'post' | 'patch';
    relatedRecords?: Record<string, RecordOption[]>;
    members?: MemberOption[];
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
    assignee_ids: number[];
};

// Radix Select forbids an empty-string item value; map this sentinel ↔ '' (standalone).
const STANDALONE = 'standalone';

export default function TaskForm({ task, onSuccess, submitRoute, method = 'post', relatedRecords = {}, members = [] }: Props) {
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
        assignee_ids: task?.assignees?.map((a) => a.id) ?? [],
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();

        const submit = method === 'patch' ? patch : post;
        submit(submitRoute, { onSuccess });
    }

    function handleRelatedTypeChange(v: string) {
        const newType = v === STANDALONE ? '' : v;
        setData((prev) => ({ ...prev, related_type: newType, related_id: '' }));
    }

    function toggleAssignee(userId: number) {
        setData('assignee_ids', data.assignee_ids.includes(userId) ? data.assignee_ids.filter((id) => id !== userId) : [...data.assignee_ids, userId]);
    }

    const PRIORITIES: { value: string; label: string }[] = [
        { value: '1', label: t('tasks.priority.low') ?? 'Low' },
        { value: '2', label: t('tasks.priority.medium') ?? 'Medium' },
        { value: '3', label: t('tasks.priority.high') ?? 'High' },
        { value: '4', label: t('tasks.priority.urgent') ?? 'Urgent' },
    ];

    const RELATED_TYPES: { value: string; label: string }[] = [
        { value: STANDALONE, label: t('tasks.related_type.standalone') ?? 'Standalone' },
        { value: 'lead', label: t('tasks.related_type.lead') ?? 'Lead' },
        { value: 'client', label: t('tasks.related_type.client') ?? 'Client' },
        { value: 'project', label: t('tasks.related_type.project') ?? 'Project' },
        { value: 'contact', label: t('tasks.related_type.contact') ?? 'Contact' },
    ];

    const activeRelatedType = data.related_type; // '' = standalone
    const relatedOptions: RecordOption[] = activeRelatedType ? (relatedRecords[activeRelatedType] ?? []) : [];

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
                    <Select value={data.related_type || STANDALONE} onValueChange={handleRelatedTypeChange}>
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

            {/* BUG-07 fix: dependent record picker — only shown when a non-standalone type is selected */}
            {activeRelatedType && (
                <div>
                    <Label>
                        {RELATED_TYPES.find((rt) => rt.value === activeRelatedType)?.label ?? activeRelatedType}
                    </Label>
                    <Select value={data.related_id || ''} onValueChange={(v) => setData('related_id', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('tasks.fields.related_to') ?? 'Select...'} />
                        </SelectTrigger>
                        <SelectContent>
                            {relatedOptions.length === 0 ? (
                                <div className="text-muted-foreground px-2 py-2 text-sm">—</div>
                            ) : (
                                relatedOptions.map((rec) => (
                                    <SelectItem key={rec.id} value={rec.id}>
                                        {rec.name}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    <InputError message={errors.related_id} />
                </div>
            )}

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

            {/* Assignees multi-select (BUG-10 partial fix in form) */}
            {members.length > 0 && (
                <div>
                    <Label>{t('tasks.fields.assignees') ?? 'Assignees'}</Label>
                    <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
                        {members.map((m) => (
                            <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.assignee_ids.includes(m.id)}
                                    onChange={() => toggleAssignee(m.id)}
                                    className="rounded"
                                />
                                {m.name}
                            </label>
                        ))}
                    </div>
                    <InputError message={errors.assignee_ids as unknown as string} />
                </div>
            )}

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
