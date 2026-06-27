import CustomFieldsSection from '@/components/custom-fields/custom-fields-section';
import type { CustomFieldDefinition } from '@/components/custom-fields/types';
import QuickCreateLookup from '@/components/quick-create-lookup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslator } from '@/lib/i18n';
import type { CustomFieldValue, Lead, LeadSource, Pipeline, PipelineStage, User } from '@/types';
import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
    lead?: Lead;
    pipelines: (Pipeline & { stages: PipelineStage[] })[];
    sources: LeadSource[];
    members: Pick<User, 'id' | 'name'>[];
    fieldDefs: CustomFieldDefinition[];
    submitRoute: string;
    method: 'post' | 'patch';
}

type LeadFormData = {
    name: string;
    title: string;
    email: string;
    phone: string;
    company: string;
    lead_value: string;
    website: string;
    description: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    pipeline_id: string;
    stage_id: string;
    source_id: string;
    assigned_to: string;
    is_public: boolean;
    custom_fields: Record<string, CustomFieldValue>;
};

export default function LeadForm({ lead, pipelines, sources, members, fieldDefs, submitRoute, method }: Props) {
    const t = useTranslator();

    // Derive initial pipeline stages
    const defaultPipeline = pipelines.find((p) => p.is_default) ?? pipelines[0];
    const initialPipeline = lead ? (pipelines.find((p) => p.id === lead.pipeline_id) ?? defaultPipeline) : defaultPipeline;

    const [availableStages, setAvailableStages] = useState<PipelineStage[]>(initialPipeline?.stages ?? []);

    const { data, setData, post, patch, processing, errors } = useForm<LeadFormData>({
        name: lead?.name ?? '',
        title: lead?.title ?? '',
        email: lead?.email ?? '',
        phone: lead?.phone ?? '',
        company: lead?.company ?? '',
        lead_value: lead?.lead_value ?? '',
        website: lead?.website ?? '',
        description: lead?.description ?? '',
        address: lead?.address ?? '',
        city: lead?.city ?? '',
        state: lead?.state ?? '',
        zip: lead?.zip ?? '',
        country: lead?.country ?? '',
        pipeline_id: lead?.pipeline_id ?? initialPipeline?.id ?? '',
        stage_id: lead?.stage_id ?? initialPipeline?.stages[0]?.id ?? '',
        source_id: lead?.source_id ?? '',
        assigned_to: lead?.assigned_to ? String(lead.assigned_to) : '',
        is_public: lead?.is_public ?? false,
        custom_fields: lead?.custom_fields ?? {},
    });

    // When pipeline changes, update available stages and reset stage_id
    useEffect(() => {
        const pipeline = pipelines.find((p) => p.id === data.pipeline_id);
        const stages = pipeline?.stages ?? [];
        setAvailableStages(stages);

        if (stages.length > 0 && !stages.find((s) => s.id === data.stage_id)) {
            setData('stage_id', stages[0].id);
        }
    }, [data.pipeline_id]);

    // After a source is quick-created, the refreshed `sources` prop arrives; select it by name.
    const [pendingSourceName, setPendingSourceName] = useState<string | null>(null);
    useEffect(() => {
        if (!pendingSourceName) return;
        const created = sources.find((s) => s.name === pendingSourceName);
        if (!created) return;
        setData('source_id', created.id);
        setPendingSourceName(null);
    }, [sources, pendingSourceName, setData]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (method === 'post') {
            post(submitRoute);
        } else {
            patch(submitRoute);
        }
    }

    function handleCustomFieldChange(slug: string, value: CustomFieldValue) {
        setData('custom_fields', { ...data.custom_fields, [slug]: value });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Core info */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="name">{t('leads.fields.name')} *</Label>
                    <Input
                        id="name"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder={t('leads.fields.name')}
                        required
                    />
                    {errors.name && <p className="text-destructive text-xs">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="title">{t('leads.fields.title')}</Label>
                    <Input id="title" value={data.title} onChange={(e) => setData('title', e.target.value)} placeholder={t('leads.fields.title')} />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="email">{t('leads.fields.email')}</Label>
                    <Input id="email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                    {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="phone">{t('leads.fields.phone')}</Label>
                    <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="company">{t('leads.fields.company')}</Label>
                    <Input id="company" value={data.company} onChange={(e) => setData('company', e.target.value)} />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="lead_value">{t('leads.fields.lead_value')}</Label>
                    <Input
                        id="lead_value"
                        type="number"
                        min="0"
                        step="0.01"
                        value={data.lead_value}
                        onChange={(e) => setData('lead_value', e.target.value)}
                    />
                    {errors.lead_value && <p className="text-destructive text-xs">{errors.lead_value}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="website">{t('leads.fields.website')}</Label>
                    <Input id="website" value={data.website} onChange={(e) => setData('website', e.target.value)} />
                </div>
            </div>

            {/* Pipeline + Stage */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label>{t('leads.fields.pipeline')} *</Label>
                    <Select value={data.pipeline_id} onValueChange={(v) => setData('pipeline_id', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('leads.fields.pipeline')} />
                        </SelectTrigger>
                        <SelectContent>
                            {pipelines.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.pipeline_id && <p className="text-destructive text-xs">{errors.pipeline_id}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label>{t('leads.fields.stage')} *</Label>
                    <Select value={data.stage_id} onValueChange={(v) => setData('stage_id', v)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('leads.fields.stage')} />
                        </SelectTrigger>
                        <SelectContent>
                            {availableStages.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.stage_id && <p className="text-destructive text-xs">{errors.stage_id}</p>}
                </div>

                <div className="space-y-1.5">
                    <Label>{t('leads.fields.source')}</Label>
                    <div className="flex items-center gap-2">
                        <Select value={data.source_id} onValueChange={(v) => setData('source_id', v === 'none' ? '' : v)}>
                            <SelectTrigger className="flex-1">
                                <SelectValue placeholder={t('leads.fields.source')} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {sources.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <QuickCreateLookup
                            storeRoute={route('lookups.lead-sources.store')}
                            triggerLabel={t('platform.quick_create.new_source') ?? 'New source'}
                            dialogTitle={t('platform.quick_create.new_source') ?? 'New source'}
                            placeholder={t('leads.fields.source') ?? 'Source'}
                            onCreated={(nm) => setPendingSourceName(nm)}
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label>{t('leads.fields.assigned_to')}</Label>
                    <Select value={data.assigned_to} onValueChange={(v) => setData('assigned_to', v === 'none' ? '' : v)}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('leads.fields.assigned_to')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {members.map((m) => (
                                <SelectItem key={m.id} value={String(m.id)}>
                                    {m.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
                <Label htmlFor="description">{t('leads.fields.description')}</Label>
                <Textarea id="description" value={data.description} onChange={(e) => setData('description', e.target.value)} rows={4} />
            </div>

            {/* Address */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="address">{t('leads.address.street')}</Label>
                    <Input id="address" value={data.address} onChange={(e) => setData('address', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="city">{t('leads.address.city')}</Label>
                    <Input id="city" value={data.city} onChange={(e) => setData('city', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="country">{t('leads.address.country')}</Label>
                    <Input id="country" value={data.country} onChange={(e) => setData('country', e.target.value)} />
                </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-2">
                <input
                    id="is_public"
                    type="checkbox"
                    checked={data.is_public}
                    onChange={(e) => setData('is_public', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="is_public" className="cursor-pointer">
                    {t('leads.fields.is_public')}
                </Label>
            </div>

            {/* Custom fields */}
            {fieldDefs.length > 0 && (
                <CustomFieldsSection definitions={fieldDefs} values={data.custom_fields} errors={errors} onChange={handleCustomFieldChange} />
            )}

            <div className="flex justify-end gap-3">
                <Button type="submit" disabled={processing}>
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {method === 'post' ? t('leads.actions.create') : t('leads.actions.edit')}
                </Button>
            </div>
        </form>
    );
}
