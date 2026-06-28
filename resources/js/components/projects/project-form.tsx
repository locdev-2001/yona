import CustomFieldsSection from '@/components/shared/custom-fields/custom-fields-section';
import type { CustomFieldDefinition } from '@/components/shared/custom-fields/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useTranslator } from '@/lib/i18n';
import type { Client, CustomFieldValue, Project, ProjectStatus, User } from '@/types';
import { useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Props {
    project?: Project;
    clients: Pick<Client, 'id' | 'name'>[];
    statuses: ProjectStatus[];
    members: Pick<User, 'id' | 'name'>[];
    fieldDefs?: CustomFieldDefinition[];
    submitRoute: string;
    method?: 'post' | 'patch';
}

const BILLING_TYPES = [
    { value: '3', labelKey: 'projects.billing_types.non_billable' },
    { value: '1', labelKey: 'projects.billing_types.fixed' },
    { value: '2', labelKey: 'projects.billing_types.hourly' },
];

// sentinel: no owner explicitly chosen (server defaults to creator)
const NO_OWNER = '__none__';

export default function ProjectForm({ project, clients, statuses, members, fieldDefs, submitRoute, method = 'post' }: Props) {
    const t = useTranslator();

    const { data, setData, post, patch, processing, errors } = useForm<{
        name: string;
        description: string;
        client_id: string;
        status_id: string;
        owner_id: string;
        billing_type: string;
        start_date: string;
        deadline: string;
        progress: number;
        progress_from_tasks: boolean;
        visible_to_customer: boolean;
        custom_fields: Record<string, CustomFieldValue>;
    }>({
        name: project?.name ?? '',
        description: project?.description ?? '',
        client_id: project?.client_id ?? '',
        status_id: project?.status_id ?? '',
        // owner?.id is number; stringify for Select (sentinel __none__ is string)
        owner_id: project?.owner?.id != null ? String(project.owner.id) : '',
        billing_type: String(project?.billing_type ?? 3),
        start_date: project?.start_date ?? '',
        deadline: project?.deadline ?? '',
        progress: project?.progress ?? 0,
        progress_from_tasks: project?.progress_from_tasks ?? false,
        visible_to_customer: project?.visible_to_customer ?? false,
        custom_fields: project?.custom_fields ?? {},
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (method === 'patch') {
            patch(submitRoute);
        } else {
            post(submitRoute);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div className="space-y-1">
                <Label htmlFor="name">{t('projects.fields.name')}</Label>
                <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required maxLength={191} />
                {errors.name && <p className="text-destructive text-sm">{errors.name}</p>}
            </div>

            {/* Client */}
            <div className="space-y-1">
                <Label htmlFor="client_id">{t('projects.fields.client')}</Label>
                <Select value={data.client_id} onValueChange={(v) => setData('client_id', v)}>
                    <SelectTrigger id="client_id">
                        <SelectValue placeholder="— select client —" />
                    </SelectTrigger>
                    <SelectContent>
                        {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                                {c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.client_id && <p className="text-destructive text-sm">{errors.client_id}</p>}
            </div>

            {/* Status */}
            {statuses.length > 0 && (
                <div className="space-y-1">
                    <Label htmlFor="status_id">{t('projects.fields.status') ?? 'Status'}</Label>
                    <Select value={data.status_id || NO_OWNER} onValueChange={(v) => setData('status_id', v === NO_OWNER ? '' : v)}>
                        <SelectTrigger id="status_id">
                            <SelectValue placeholder="— default —" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NO_OWNER}>{t('projects.fields.status_default') ?? '— default —'}</SelectItem>
                            {statuses.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Owner */}
            {members.length > 0 && (
                <div className="space-y-1">
                    <Label htmlFor="owner_id">{t('projects.fields.owner') ?? 'Owner'}</Label>
                    <Select value={data.owner_id || NO_OWNER} onValueChange={(v) => setData('owner_id', v === NO_OWNER ? '' : v)}>
                        <SelectTrigger id="owner_id">
                            <SelectValue placeholder="— me (default) —" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={NO_OWNER}>{t('projects.fields.owner_default') ?? '— me (default) —'}</SelectItem>
                            {members.map((m) => (
                                <SelectItem key={m.id} value={String(m.id)}>
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.owner_id && <p className="text-destructive text-sm">{errors.owner_id}</p>}
                </div>
            )}

            {/* Billing type */}
            <div className="space-y-1">
                <Label htmlFor="billing_type">{t('projects.fields.billing_type')}</Label>
                <Select value={data.billing_type} onValueChange={(v) => setData('billing_type', v)}>
                    <SelectTrigger id="billing_type">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {BILLING_TYPES.map((bt) => (
                            <SelectItem key={bt.value} value={bt.value}>
                                {t(bt.labelKey)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.billing_type && <p className="text-destructive text-sm">{errors.billing_type}</p>}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="start_date">{t('projects.fields.start_date')}</Label>
                    <Input id="start_date" type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                    {errors.start_date && <p className="text-destructive text-sm">{errors.start_date}</p>}
                </div>
                <div className="space-y-1">
                    <Label htmlFor="deadline">{t('projects.fields.deadline')}</Label>
                    <Input id="deadline" type="date" value={data.deadline} onChange={(e) => setData('deadline', e.target.value)} />
                    {errors.deadline && <p className="text-destructive text-sm">{errors.deadline}</p>}
                </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
                <Label htmlFor="description">{t('projects.fields.description')}</Label>
                <Textarea id="description" value={data.description} onChange={(e) => setData('description', e.target.value)} rows={4} />
                {errors.description && <p className="text-destructive text-sm">{errors.description}</p>}
            </div>

            {/* Custom fields */}
            {fieldDefs && fieldDefs.length > 0 && (
                <CustomFieldsSection
                    definitions={fieldDefs}
                    values={data.custom_fields}
                    errors={errors as Record<string, string>}
                    onChange={(slug, value) => setData('custom_fields', { ...data.custom_fields, [slug]: value })}
                />
            )}

            {/* Toggles */}
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
                <div className="flex items-center gap-2">
                    <Switch id="progress_from_tasks" checked={data.progress_from_tasks} onCheckedChange={(v) => setData('progress_from_tasks', v)} />
                    <Label htmlFor="progress_from_tasks">{t('projects.fields.progress_from_tasks')}</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Switch id="visible_to_customer" checked={data.visible_to_customer} onCheckedChange={(v) => setData('visible_to_customer', v)} />
                    <Label htmlFor="visible_to_customer">{t('projects.fields.visible_to_customer')}</Label>
                </div>
            </div>

            <Button type="submit" disabled={processing}>
                {method === 'patch' ? t('projects.actions.edit') : t('projects.actions.create')}
            </Button>
        </form>
    );
}
