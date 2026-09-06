import type { FilterOption } from 'dashboard/components-next/filter/helper/filterHelper';
import { getActionIcon, PRIORITY_CONDITION_VALUES } from 'dashboard/settings/automation/constants';
import type { AutomationActionDefinition } from 'dashboard/settings/automation/constants';
import { generateActionParams } from 'dashboard/settings/automation/automationHelper';
import { t } from '../../../i18n';
import type { Macro, MacroAction, MacroDraft, MacroFile, MacroOptionSets } from './types';

// Port từ routes/dashboard/settings/macros/{constants.js,macroHelper.js} +
// composables/useMacros.js. Chỉ giữ action đã có driver trong ActionExecutor —
// cùng lý do (và cùng danh sách bị ẩn) như settings/automation/constants.ts:
// send_email_transcript, send_attachment, send_webhook_event chưa có seam.
export const MACRO_ACTION_TYPES: AutomationActionDefinition[] = [
    { key: 'assign_team', label: 'ASSIGN_TEAM', inputType: 'search_select' },
    { key: 'assign_agent', label: 'ASSIGN_AGENT', inputType: 'search_select' },
    { key: 'add_label', label: 'ADD_LABEL', inputType: 'multi_select' },
    { key: 'remove_label', label: 'REMOVE_LABEL', inputType: 'multi_select' },
    { key: 'remove_assigned_agent', label: 'REMOVE_ASSIGNED_AGENT', inputType: null },
    { key: 'remove_assigned_team', label: 'REMOVE_ASSIGNED_TEAM', inputType: null },
    { key: 'mute_conversation', label: 'MUTE_CONVERSATION', inputType: null },
    { key: 'snooze_conversation', label: 'SNOOZE_CONVERSATION', inputType: null },
    { key: 'resolve_conversation', label: 'RESOLVE_CONVERSATION', inputType: null },
    { key: 'send_message', label: 'SEND_MESSAGE', inputType: 'textarea' },
    { key: 'add_private_note', label: 'ADD_PRIVATE_NOTE', inputType: 'textarea' },
    { key: 'change_priority', label: 'CHANGE_PRIORITY', inputType: 'search_select' },
];

export const DEFAULT_MACRO_ACTION_NAME = 'assign_team';

export const emptyMacro: MacroDraft = {
    name: '',
    actions: [{ action_name: DEFAULT_MACRO_ACTION_NAME, action_params: [] }],
    visibility: 'global',
};

export const newMacroAction = (): MacroAction => ({ action_name: DEFAULT_MACRO_ACTION_NAME, action_params: [] });

export const resolveActionName = (key: string): string =>
    MACRO_ACTION_TYPES.find(item => item.key === key)?.label ?? key.toUpperCase();

export const getFileName = (id: unknown, actionType: string, files?: MacroFile[]): string => {
    if (!id || !files) return '';
    if (actionType !== 'send_attachment') return '';
    return files.find(item => item.blob_id === id)?.filename?.toString() ?? '';
};

export const getMacroActionDefinition = (actionName: string): AutomationActionDefinition | undefined =>
    MACRO_ACTION_TYPES.find(item => item.key === actionName);

// MacroNode.vue: send_message vẽ editor ở hàng dưới nên hàng trên không có input.
export const showMacroActionInput = (actionName: string): boolean => {
    if (actionName === 'send_message') return false;
    return Boolean(getMacroActionDefinition(actionName)?.inputType);
};

export interface MacroActionTypeOption extends AutomationActionDefinition {
    labelText: string;
    icon: string;
}

export const macroActionTypeOptions = (): MacroActionTypeOption[] =>
    MACRO_ACTION_TYPES.map(type => ({
        ...type,
        labelText: t(`MACROS.ACTIONS.${type.label}`),
        icon: getActionIcon(type.key),
    }));

const withNoneOption = (options: FilterOption[] = []): FilterOption[] => [
    { id: 'nil', name: t('AUTOMATION.NONE_OPTION') },
    ...options,
];

// useMacros.getMacroDropdownValues — assign_agent của macro có thêm "Self"
// (người bấm chạy macro), khác automation dùng last_responding_agent.
export const getMacroDropdownValues = (actionName: string, optionSets: MacroOptionSets): FilterOption[] => {
    switch (actionName) {
        case 'assign_team':
            return withNoneOption(optionSets.teams);
        case 'assign_agent':
            return [...withNoneOption(), { id: 'self', name: 'Self' }, ...optionSets.agents];
        case 'add_label':
        case 'remove_label':
            return optionSets.labels;
        case 'change_priority':
            return PRIORITY_CONDITION_VALUES.map(item => ({ id: item.id, name: t(`MACROS.PRIORITY_TYPES.${item.i18nKey}`) }));
        default:
            return [];
    }
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]);

const resolveActionValue = (action: MacroAction, optionSets: MacroOptionSets, files?: MacroFile[]): string => {
    const params = asArray(action.action_params);
    if (!params.length) return '';

    const options = getMacroDropdownValues(action.action_name, optionSets);
    if (options.length) {
        return params
            .map(id => options.find(option => option.id === id)?.name)
            .filter(Boolean)
            .join(', ');
    }

    if (action.action_name === 'send_attachment') return getFileName(params[0], action.action_name, files);

    return String(params[0]);
};

export interface ResolvedMacroAction {
    actionName: string;
    actionValue: string;
}

// useMacros.resolveMacroActions — cặp tên/giá trị hiện trong popup xem trước.
export const resolveMacroActions = (macro: Pick<Macro, 'actions' | 'files'>, optionSets: MacroOptionSets): ResolvedMacroAction[] =>
    macro.actions.map(action => ({
        actionName: resolveActionName(action.action_name),
        actionValue: resolveActionValue(action, optionSets, macro.files),
    }));

// MacroEditor.formatMacro — id thuần từ API về FilterOption để dropdown hiện đúng.
export const formatMacro = <T extends Pick<Macro, 'actions'>>(macro: T, optionSets: MacroOptionSets): T => ({
    ...macro,
    actions: macro.actions.map(action => {
        const params = asArray(action.action_params);
        if (!params.length) return { ...action, action_params: [] };

        const inputType = getMacroActionDefinition(action.action_name)?.inputType;
        if (inputType === 'multi_select' || inputType === 'search_select') {
            return {
                ...action,
                action_params: getMacroDropdownValues(action.action_name, optionSets).filter(item => params.includes(item.id)),
            };
        }
        return { ...action, action_params: [...params] };
    }),
});

export interface MacroPayload {
    name: string;
    visibility: string;
    actions: MacroAction[];
}

// actionQueryGenerator.js dùng chung với Automation (generateActionParams).
export const generateMacroPayload = (macro: MacroDraft): MacroPayload => ({
    name: macro.name,
    visibility: macro.visibility,
    actions: macro.actions.map(action => ({
        action_name: action.action_name,
        action_params: generateActionParams(action.action_params),
    })),
});
