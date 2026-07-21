import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslator } from '@/lib/i18n';
import type { Pipeline, PipelineStage, User } from '@/types';
import { Trash2 } from 'lucide-react';
import type { FlowNode } from './graph-serialize';
import { CHANNEL_KEYS, CONDITION_FIELD_SUGGESTIONS, CONDITION_OPERATORS, TASK_PRIORITIES, TRIGGER_KEYS, WAIT_UNITS } from './node-registry';

interface Props {
    node: FlowNode | null;
    onChange: (config: Record<string, unknown>) => void;
    onDelete: () => void;
    pipelines: (Pipeline & { stages: PipelineStage[] })[];
    members: Pick<User, 'id' | 'name'>[];
}

type Condition = { field?: string; operator?: string; value?: unknown };

/** Docked right-side panel — renders a different config form per node type,
 * switched by `node.data.nodeType` (docs/crm-automation-workflow.md
 * §Node Handler registry — field shapes mirror each NodeHandler's own
 * `$node['config'][...]` reads, see app/Modules/Automation/Handlers/*). */
export function InspectorPanel({ node, onChange, onDelete, pipelines, members }: Props) {
    const t = useTranslator();

    if (!node) {
        return (
            <div className="w-80 shrink-0 border-l p-4">
                <p className="text-muted-foreground text-sm">{t('automation.canvas.inspector_empty')}</p>
            </div>
        );
    }

    const config = node.data.config;
    const set = (patch: Record<string, unknown>) => onChange({ ...config, ...patch });

    return (
        <div className="w-80 shrink-0 space-y-4 overflow-y-auto border-l p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t(`automation.node_types.${node.data.nodeType}`)}</p>
                {node.data.nodeType !== 'start' && (
                    <Button type="button" variant="ghost" size="icon" onClick={onDelete} title={t('automation.canvas.delete_node')}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {node.data.nodeType === 'start' && <StartFields config={config} set={set} t={t} />}
            {node.data.nodeType === 'condition' && <ConditionFields config={config} set={set} t={t} />}
            {node.data.nodeType === 'wait' && <WaitFields config={config} set={set} t={t} />}
            {node.data.nodeType === 'send_message' && <SendMessageFields config={config} set={set} t={t} />}
            {node.data.nodeType === 'create_task' && <CreateTaskFields config={config} set={set} t={t} />}
            {node.data.nodeType === 'notify_internal' && <NotifyInternalFields config={config} set={set} t={t} members={members} />}
            {node.data.nodeType === 'tag' && <TagFields config={config} set={set} t={t} />}
            {node.data.nodeType === 'change_lead_stage' && <ChangeLeadStageFields config={config} set={set} t={t} pipelines={pipelines} />}
        </div>
    );
}

type FieldProps = {
    config: Record<string, unknown>;
    set: (patch: Record<string, unknown>) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
};

function StartFields({ config, set, t }: FieldProps) {
    return (
        <div className="space-y-1.5">
            <Label>{t('automation.fields.trigger')}</Label>
            <Select value={(config.trigger as string) ?? ''} onValueChange={(v) => set({ trigger: v })}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {TRIGGER_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                            {t(`automation.triggers.${key}`)}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function ConditionFields({ config, set, t }: FieldProps) {
    const conditions: Condition[] = Array.isArray(config.conditions) ? (config.conditions as Condition[]) : [];

    function update(index: number, patch: Partial<Condition>) {
        const next = conditions.map((c, i) => (i === index ? { ...c, ...patch } : c));
        set({ conditions: next });
    }

    function remove(index: number) {
        set({ conditions: conditions.filter((_, i) => i !== index) });
    }

    function add() {
        set({ conditions: [...conditions, { field: '', operator: 'equals', value: '' }] });
    }

    return (
        <div className="space-y-3">
            {conditions.map((condition, index) => (
                <div key={index} className="space-y-1.5 rounded-md border p-2">
                    <Input
                        list="automation-condition-fields"
                        placeholder={t('automation.fields.condition_field')}
                        value={condition.field ?? ''}
                        onChange={(e) => update(index, { field: e.target.value })}
                    />
                    <Select value={condition.operator ?? 'equals'} onValueChange={(v) => update(index, { operator: v })}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {CONDITION_OPERATORS.map((op) => (
                                <SelectItem key={op} value={op}>
                                    {t(`automation.operators.${op}`)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder={t('automation.fields.condition_value')}
                        value={(condition.value as string) ?? ''}
                        onChange={(e) => update(index, { value: e.target.value })}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                        {t('automation.fields.remove_condition')}
                    </Button>
                </div>
            ))}
            <datalist id="automation-condition-fields">
                {CONDITION_FIELD_SUGGESTIONS.map((f) => (
                    <option key={f} value={f} />
                ))}
            </datalist>
            <Button type="button" variant="outline" size="sm" onClick={add}>
                {t('automation.fields.add_condition')}
            </Button>
        </div>
    );
}

function WaitFields({ config, set, t }: FieldProps) {
    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <Label>{t('automation.fields.wait_amount')}</Label>
                <Input type="number" min={0} value={(config.amount as number) ?? 0} onChange={(e) => set({ amount: Number(e.target.value) })} />
            </div>
            <div className="space-y-1.5">
                <Label>{t('automation.fields.wait_unit')}</Label>
                <Select value={(config.unit as string) ?? 'minutes'} onValueChange={(v) => set({ unit: v })}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {WAIT_UNITS.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                                {t(`automation.fields.wait_${unit}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

function SendMessageFields({ config, set, t }: FieldProps) {
    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <Label>{t('automation.fields.channel')}</Label>
                <Select value={(config.channel as string) ?? CHANNEL_KEYS[0]} onValueChange={(v) => set({ channel: v })}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CHANNEL_KEYS.map((channel) => (
                            <SelectItem key={channel} value={channel}>
                                {channel}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label>{t('automation.fields.message_body')}</Label>
                <Textarea value={(config.body as string) ?? ''} onChange={(e) => set({ body: e.target.value })} rows={4} />
            </div>
        </div>
    );
}

function CreateTaskFields({ config, set, t }: FieldProps) {
    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <Label>{t('automation.fields.task_name')}</Label>
                <Input value={(config.name as string) ?? ''} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
                <Label>{t('automation.fields.task_description')}</Label>
                <Textarea value={(config.description as string) ?? ''} onChange={(e) => set({ description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-1.5">
                <Label>{t('automation.fields.task_priority')}</Label>
                <Select value={String(config.priority ?? 2)} onValueChange={(v) => set({ priority: Number(v) })}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {TASK_PRIORITIES.map((p) => (
                            <SelectItem key={p.value} value={String(p.value)}>
                                {t(`automation.priorities.${p.key}`)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label>{t('automation.fields.task_due_in_days')}</Label>
                <Input
                    type="number"
                    min={0}
                    value={(config.due_in_days as number) ?? ''}
                    onChange={(e) => set({ due_in_days: e.target.value === '' ? undefined : Number(e.target.value) })}
                />
            </div>
        </div>
    );
}

function NotifyInternalFields({ config, set, t, members }: FieldProps & { members: Pick<User, 'id' | 'name'>[] }) {
    const userIds: number[] = Array.isArray(config.user_ids) ? (config.user_ids as number[]) : [];

    function toggle(id: number) {
        set({ user_ids: userIds.includes(id) ? userIds.filter((u) => u !== id) : [...userIds, id] });
    }

    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <Label>{t('automation.fields.notify_recipients')}</Label>
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                    {members.map((m) => (
                        <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm">
                            <input type="checkbox" checked={userIds.includes(m.id)} onChange={() => toggle(m.id)} className="rounded" />
                            {m.name}
                        </label>
                    ))}
                </div>
            </div>
            <div className="space-y-1.5">
                <Label>{t('automation.fields.notify_message')}</Label>
                <Textarea value={(config.message as string) ?? ''} onChange={(e) => set({ message: e.target.value })} rows={3} />
            </div>
        </div>
    );
}

function TagFields({ config, set, t }: FieldProps) {
    const action = (config.action as string) ?? 'attach';

    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <Label>{t('automation.fields.tag_action')}</Label>
                <Select value={action} onValueChange={(v) => set({ action: v })}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="attach">{t('automation.fields.tag_attach')}</SelectItem>
                        <SelectItem value="detach">{t('automation.fields.tag_detach')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5">
                <Label>{t('automation.fields.tag_name')}</Label>
                <Input value={(config.tag as string) ?? ''} onChange={(e) => set({ tag: e.target.value })} />
            </div>
            {action === 'attach' && (
                <div className="space-y-1.5">
                    <Label>{t('automation.fields.tag_color')}</Label>
                    <Input type="color" value={(config.color as string) ?? '#64748b'} onChange={(e) => set({ color: e.target.value })} />
                </div>
            )}
        </div>
    );
}

function ChangeLeadStageFields({ config, set, t, pipelines }: FieldProps & { pipelines: (Pipeline & { stages: PipelineStage[] })[] }) {
    return (
        <div className="space-y-1.5">
            <Label>{t('automation.fields.pipeline_stage')}</Label>
            <Select value={(config.stage_id as string) ?? ''} onValueChange={(v) => set({ stage_id: v })}>
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {pipelines.map((pipeline) => (
                        <SelectGroupByPipeline key={pipeline.id} pipeline={pipeline} />
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

function SelectGroupByPipeline({ pipeline }: { pipeline: Pipeline & { stages: PipelineStage[] } }) {
    return (
        <>
            {pipeline.stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                    {pipeline.name} — {stage.name}
                </SelectItem>
            ))}
        </>
    );
}
