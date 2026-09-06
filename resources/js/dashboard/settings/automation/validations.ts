import type { AutomationAction, AutomationCondition, AutomationRule } from './types';

// Port từ dashboard/helper/validations.js (validateAutomation). Key lỗi giữ
// nguyên để form tra `AUTOMATION.ERRORS.*` và `FILTER.ERRORS.*`.
export const ATLEAST_ONE_CONDITION_REQUIRED = 'ATLEAST_ONE_CONDITION_REQUIRED';
export const ATLEAST_ONE_ACTION_REQUIRED = 'ATLEAST_ONE_ACTION_REQUIRED';
export const ACTION_PARAMETERS_REQUIRED = 'ACTION_PARAMETERS_REQUIRED';
const VALUE_REQUIRED = 'VALUE_REQUIRED';
const ATTRIBUTE_KEY_REQUIRED = 'ATTRIBUTE_KEY_REQUIRED';
const FILTER_OPERATOR_REQUIRED = 'FILTER_OPERATOR_REQUIRED';

const NO_PARAM_ACTIONS = [
    'mute_conversation',
    'snooze_conversation',
    'resolve_conversation',
    'remove_assigned_agent',
    'remove_assigned_team',
    'open_conversation',
    'pending_conversation',
];

export type AutomationErrors = Record<string, string | boolean>;

const isEmptyValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return String(value).trim() === '';
};

export const validateSingleCondition = (condition: AutomationCondition): string | null => {
    if (!condition.attribute_key) return ATTRIBUTE_KEY_REQUIRED;
    if (!condition.filter_operator) return FILTER_OPERATOR_REQUIRED;
    const requiresValue = !['is_present', 'is_not_present'].includes(condition.filter_operator);
    if (requiresValue && isEmptyValue(condition.values)) return VALUE_REQUIRED;
    return null;
};

const validateSingleAction = (action: AutomationAction): string | null => {
    if (NO_PARAM_ACTIONS.includes(action.action_name)) return null;
    return isEmptyValue(action.action_params) ? ACTION_PARAMETERS_REQUIRED : null;
};

export const validateAutomation = (automation: Pick<AutomationRule, 'name' | 'description' | 'event_name' | 'conditions' | 'actions'>): AutomationErrors => {
    const errors: AutomationErrors = {};
    if (!automation.name?.trim()) errors.name = true;
    if (!automation.description?.trim()) errors.description = true;
    if (!automation.event_name) errors.event_name = true;

    if (!automation.conditions?.length) {
        errors.conditions = ATLEAST_ONE_CONDITION_REQUIRED;
    } else {
        automation.conditions.forEach((condition, index) => {
            const error = validateSingleCondition(condition);
            if (error) errors[`condition_${index}`] = error;
        });
    }

    if (!automation.actions?.length) {
        errors.actions = ATLEAST_ONE_ACTION_REQUIRED;
    } else {
        automation.actions.forEach((action, index) => {
            const error = validateSingleAction(action);
            if (error) errors[`action_${index}`] = error;
        });
    }

    return errors;
};
