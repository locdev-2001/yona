import type { WorkflowNodeType } from '@/types';

/** v1 Node Handler registry (docs/crm-automation-workflow.md §Node Handler
 * registry, app/Modules/Automation/AutomationServiceProvider.php) — this list
 * must stay in sync with that file's `$manager->extend(...)` calls + the
 * 'start'/'condition'/'wait'/'end' flow types WorkflowEngine handles inline. */
export const NODE_CATEGORY: Record<WorkflowNodeType, 'start' | 'flow' | 'action'> = {
    start: 'start',
    condition: 'flow',
    wait: 'flow',
    end: 'flow',
    send_message: 'action',
    create_task: 'action',
    notify_internal: 'action',
    tag: 'action',
    change_lead_stage: 'action',
};

/** Node types a user can drag from the palette — 'start' is placed once by
 * the canvas itself (node 0), never draggable again (ValidatesWorkflowGraph
 * rejects a 2nd start node server-side). */
export const PALETTE_NODE_TYPES: WorkflowNodeType[] = [
    'condition',
    'wait',
    'end',
    'send_message',
    'create_task',
    'notify_internal',
    'tag',
    'change_lead_stage',
];

/** Node "start" config.trigger convention — read by
 * WorkflowEngine::enrollActiveWorkflowsForTrigger() and
 * app/Listeners/EvaluateWorkflowTriggers.php. Documented duplication (same
 * convention as RELATED_TYPES in resources/js/components/tasks/task-form.tsx)
 * — keep in sync with EvaluateWorkflowTriggers.php's trigger-key match arm. */
export const TRIGGER_KEYS = ['lead_created', 'lead_assigned', 'lead_stage_changed', 'message_received', 'manual'] as const;
export type TriggerKey = (typeof TRIGGER_KEYS)[number];

/** Only 1 channel driver registered today (app/Modules/Integration/Chat/ZaloPersonal/ZaloPersonalServiceProvider.php:55).
 * Add the next channel here when a 2nd driver ships — no other frontend/backend list to keep in sync. */
export const CHANNEL_KEYS = ['zalo_personal'] as const;
export type ChannelKey = (typeof CHANNEL_KEYS)[number];

export const CONDITION_OPERATORS = ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

/** Curated fields for the condition node's field picker — ConditionNodeHandler
 * itself has no fixed whitelist (data_get() on any subject attribute), this
 * is a UX curation of the common ones, not a validation boundary. Free-text
 * entry (not shown here) still works since the backend never rejects an
 * unlisted field. */
export const CONDITION_FIELD_SUGGESTIONS = ['name', 'email', 'phone', 'company', 'lead_value', 'stage_id', 'pipeline_id', 'is_public'];

export const TASK_PRIORITIES = [
    { value: 1, key: 'low' },
    { value: 2, key: 'medium' },
    { value: 3, key: 'high' },
    { value: 4, key: 'urgent' },
] as const;

export const WAIT_UNITS = ['minutes', 'hours', 'days'] as const;
export type WaitUnit = (typeof WAIT_UNITS)[number];

/** Config a freshly-dropped node starts with — must match whatever value
 * each inspector Select/Input *displays* as its default (e.g.
 * SendMessageFields shows CHANNEL_KEYS[0] when config.channel is unset), so
 * a save immediately after dropping a node persists what the UI showed
 * instead of silently omitting the key until the user touches that field. */
export function defaultConfigFor(nodeType: WorkflowNodeType): Record<string, unknown> {
    switch (nodeType) {
        case 'condition':
            return { conditions: [] };
        case 'wait':
            return { amount: 0, unit: 'minutes' };
        case 'send_message':
            return { channel: CHANNEL_KEYS[0], body: '' };
        case 'create_task':
            return { name: '', priority: 2 };
        case 'tag':
            return { action: 'attach', tag: '', color: '#64748b' };
        default:
            return {};
    }
}
