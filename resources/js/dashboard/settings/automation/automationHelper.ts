import { createElement } from 'react';

import { getAttributeIcon } from 'dashboard/components-next/filter/helper/filterAttributeIcons';
import type { FilterInputType, FilterOption, FilterType } from 'dashboard/components-next/filter/helper/filterHelper';
import languages from 'dashboard/components-next/filter/helper/languages';
import { operators } from 'dashboard/components-next/filter/operators';
import countries from 'shared/constants/countries';
import { t } from '../../../i18n';
import {
    AUTOMATION_ACTION_TYPES,
    AUTOMATION_CONDITIONS,
    MESSAGE_CONDITION_VALUES,
    PRIORITY_CONDITION_VALUES,
} from './constants';
import type { AutomationActionDefinition, AutomationConditionDefinition } from './constants';
import type { AutomationAction, AutomationCondition, AutomationOptionSets, AutomationRule } from './types';

// Port từ dashboard/helper/automationHelper.js + filterQueryGenerator.js +
// actionQueryGenerator.js + composables/useEditableAutomation.js +
// useAutomationValues.js. Hàm thuần, không state — form chỉ gọi vào đây.

const INPUT_TYPE_MAP: Record<string, FilterInputType> = {
    multi_select: 'multiSelect',
    search_select: 'searchSelect',
    plain_text: 'plainText',
    multi_text: 'multiText',
    date: 'date',
};

// Gốc gồm cả mục "All" (statusFilterOptions của useAutomationValues); form chờ
// (AutomationWaitCondition) tự lọc bỏ 'all'.
export const STATUS_FILTER_OPTIONS: FilterOption[] = [
    ...['open', 'resolved', 'pending', 'snoozed', 'all'].map(status => ({
        id: status,
        name: t(`CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.${status}.TEXT`),
    })),
    { id: 'all', name: t('CHAT_LIST.FILTER_ALL') },
];

export const BOOLEAN_FILTER_OPTIONS: FilterOption[] = [
    { id: true, name: t('FILTER.ATTRIBUTE_LABELS.TRUE') },
    { id: false, name: t('FILTER.ATTRIBUTE_LABELS.FALSE') },
];

const PRIORITY_OPTIONS: FilterOption[] = PRIORITY_CONDITION_VALUES.map(item => ({
    id: item.id,
    name: t(`AUTOMATION.PRIORITY_TYPES.${item.i18nKey}`),
}));

const MESSAGE_TYPE_OPTIONS: FilterOption[] = MESSAGE_CONDITION_VALUES.map(item => ({
    id: item.id,
    name: t(`AUTOMATION.MESSAGE_TYPES.${item.i18nKey}`),
}));

const LANGUAGE_OPTIONS: FilterOption[] = languages.map(language => ({ id: language.id, name: language.name }));
const COUNTRY_OPTIONS: FilterOption[] = countries.map(country => ({ id: country.id, name: country.name }));

const withNoneOption = (options: FilterOption[]): FilterOption[] => [{ id: 'nil', name: t('AUTOMATION.NONE_OPTION') }, ...options];

export const getConditionDropdownValues = (attributeKey: string, optionSets: AutomationOptionSets): FilterOption[] => {
    const map: Record<string, FilterOption[]> = {
        status: STATUS_FILTER_OPTIONS,
        assignee_id: optionSets.agents,
        inbox_id: optionSets.inboxes,
        team_id: optionSets.teams,
        message_type: MESSAGE_TYPE_OPTIONS,
        private_note: BOOLEAN_FILTER_OPTIONS,
        priority: PRIORITY_OPTIONS,
        labels: optionSets.labels,
        browser_language: LANGUAGE_OPTIONS,
        conversation_language: LANGUAGE_OPTIONS,
        country_code: COUNTRY_OPTIONS,
    };
    return map[attributeKey] ?? [];
};

export const getActionDropdownValues = (actionName: string, optionSets: AutomationOptionSets): FilterOption[] => {
    const map: Record<string, FilterOption[]> = {
        assign_agent: withNoneOption([{ id: 'last_responding_agent', name: t('AUTOMATION.LAST_RESPONDING_AGENT') }, ...optionSets.agents]),
        assign_team: withNoneOption(optionSets.teams),
        send_email_to_team: optionSets.teams,
        add_label: optionSets.labels,
        remove_label: optionSets.labels,
        change_priority: PRIORITY_OPTIONS,
    };
    return map[actionName] ?? [];
};

export const getConditionDefinitions = (eventName: string): AutomationConditionDefinition[] =>
    AUTOMATION_CONDITIONS[eventName] ?? [];

const definitionFor = (eventName: string, attributeKey: string): AutomationConditionDefinition | undefined =>
    getConditionDefinitions(eventName).find(item => item.key === attributeKey);

export const getActionDefinition = (actionName: string): AutomationActionDefinition | undefined =>
    AUTOMATION_ACTION_TYPES.find(item => item.key === actionName);

// showActionInput của gốc: team message và send_message vẽ input ở hàng dưới
// (vertical layout), các action inputType null không có input.
export const showActionInput = (actionName: string): boolean => {
    if (actionName === 'send_email_to_team' || actionName === 'send_message') return false;
    return Boolean(getActionDefinition(actionName)?.inputType);
};

const fallbackOperator = (value: string, label: string) => ({
    value,
    label: t(`FILTER.OPERATOR_LABELS.${value}`) === `FILTER.OPERATOR_LABELS.${value}` ? label : t(`FILTER.OPERATOR_LABELS.${value}`),
    hasInput: true,
    inputOverride: null,
    icon: createElement('span', { className: 'i-ph-equals-bold !text-n-blue-11' }),
});

// filterTypes cho ConditionRow dùng chung: attribute đã dịch, icon, operator
// làm giàu từ bộ operators chung (icon + hasInput), options theo attribute.
export const buildFilterTypes = (eventName: string, optionSets: AutomationOptionSets): FilterType[] =>
    getConditionDefinitions(eventName).map(definition => ({
        attributeKey: definition.key,
        value: definition.key,
        attributeName: t(`AUTOMATION.ATTRIBUTES.${definition.name}`),
        label: t(`AUTOMATION.ATTRIBUTES.${definition.name}`),
        icon: getAttributeIcon({ attributeKey: definition.key, attributeDisplayType: definition.attributeDisplayType }),
        inputType: INPUT_TYPE_MAP[definition.inputType] ?? 'plainText',
        options: getConditionDropdownValues(definition.key, optionSets),
        filterOperators: definition.filterOperators.map(operator => operators[operator.value] ?? fallbackOperator(operator.value, operator.label)),
        dataType: 'text',
        attributeModel: 'standard',
        disabled: definition.disabled,
    }));

const isOption = (value: unknown): value is FilterOption =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value) && 'id' in (value as object);

// filterQueryGenerator.js — values về mảng id thuần; query_operator cuối = null.
const generateConditionValues = (values: unknown): unknown[] => {
    if (Array.isArray(values)) return isOption(values[0]) ? values.map(item => (item as FilterOption).id) : values;
    if (isOption(values)) return [values.id];
    if (values === '' || values === null || values === undefined) return [];
    if (typeof values === 'object') return [];
    return [values];
};

// actionQueryGenerator.js
const generateActionParams = (params: unknown): unknown[] => {
    if (Array.isArray(params)) {
        if (params.length === 0) return [];
        const allPrimitive = params.every(item => typeof item === 'string') || params.every(item => typeof item === 'number');
        return allPrimitive ? [...params] : params.map(item => (isOption(item) ? item.id : item));
    }
    if (isOption(params)) return [params.id];
    if (params && typeof params === 'object') return [params];
    if (!params) return [];
    return [params];
};

export interface AutomationPayload {
    name: string | null;
    description: string | null;
    event_name: string;
    execution_delay?: number | null;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
}

export const generateAutomationPayload = (automation: AutomationRule | Omit<AutomationRule, 'id' | 'account_id' | 'created_on' | 'active'>): AutomationPayload => {
    const conditions = automation.conditions.map((condition, index) => ({
        attribute_key: condition.attribute_key,
        filter_operator: condition.filter_operator,
        custom_attribute_type: condition.custom_attribute_type ?? '',
        values: generateConditionValues(condition.values),
        query_operator: index === automation.conditions.length - 1 ? null : condition.query_operator ?? 'and',
    }));
    const actions = automation.actions.map(action => ({
        action_name: action.action_name,
        action_params: generateActionParams(action.action_params),
    }));

    return {
        name: automation.name,
        description: automation.description,
        event_name: automation.event_name,
        execution_delay: automation.execution_delay,
        conditions,
        actions,
    };
};

const asArray = (values: unknown): unknown[] => (Array.isArray(values) ? values : values === null || values === undefined ? [] : [values]);

// useEditableAutomation.formatAutomation — đưa id thuần từ API về FilterOption
// để dropdown hiển thị đúng khi mở form sửa.
export const formatAutomation = (rule: AutomationRule, optionSets: AutomationOptionSets): AutomationRule => ({
    ...rule,
    conditions: rule.conditions.map(condition => {
        const inputType = definitionFor(rule.event_name, condition.attribute_key)?.inputType ?? 'plain_text';
        const base: AutomationCondition = { ...condition, query_operator: condition.query_operator ?? 'and' };
        const rawValues = asArray(condition.values);

        if (inputType === 'plain_text' || inputType === 'date') return { ...base, values: rawValues[0] ?? '' };
        if (inputType === 'multi_text') return { ...base, values: [...rawValues] };

        const dropdownValues = getConditionDropdownValues(condition.attribute_key, optionSets);
        const hasBooleanOptions = inputType === 'search_select' && dropdownValues.length > 0 && dropdownValues.every(item => typeof item.id === 'boolean');
        if (hasBooleanOptions) return { ...base, values: dropdownValues.find(item => item.id === rawValues[0]) ?? {} };

        const matched = dropdownValues.filter(item => rawValues.includes(item.id));
        return { ...base, values: inputType === 'search_select' ? matched[0] ?? {} : matched };
    }),
    actions: rule.actions.map(action => {
        const params = asArray(action.action_params);
        if (params.length === 0) return { ...action, action_params: [] };
        const inputType = getActionDefinition(action.action_name)?.inputType;
        if (inputType === 'multi_select' || inputType === 'search_select') {
            return { ...action, action_params: getActionDropdownValues(action.action_name, optionSets).filter(item => params.includes(item.id)) };
        }
        return { ...action, action_params: [...params] };
    }),
});

export const getFileName = (action: AutomationAction, files: AutomationRule['files'] = []): string => {
    const blobId = asArray(action.action_params)[0];
    if (!blobId || action.action_name !== 'send_attachment') return '';
    return files?.find(item => item.blob_id === blobId)?.filename ?? '';
};

export const formatDelay = (minutes: number): string => {
    if (minutes % 1440 === 0) return `${minutes / 1440}d`;
    if (minutes % 60 === 0) return `${minutes / 60}h`;
    return `${minutes}m`;
};
