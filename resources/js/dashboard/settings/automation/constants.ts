import type { AutomationCondition, AutomationAction } from './types';

// Port từ routes/dashboard/settings/automation/constants.js + operators.js +
// dashboard/constants/automation.js. inputType giữ nguyên chuỗi của gốc để
// automationHelper map sang inputType của filter ConditionRow (INPUT_TYPE_MAP).
export type AutomationConditionInputType = 'search_select' | 'multi_select' | 'plain_text' | 'multi_text' | 'date';
export type AutomationActionInputType = 'search_select' | 'multi_select' | 'textarea' | 'team_message' | 'email' | 'url' | 'attachment' | null;

export interface AutomationOperatorOption {
    value: string;
    label: string;
}

export interface AutomationConditionDefinition {
    key: string;
    name: string;
    inputType: AutomationConditionInputType;
    filterOperators: AutomationOperatorOption[];
    customAttributeType?: string;
    attributeDisplayType?: string;
    disabled?: boolean;
}

export interface AutomationActionDefinition {
    key: string;
    label: string;
    inputType: AutomationActionInputType;
}

const op = (value: string, label: string): AutomationOperatorOption => ({ value, label });

export const OPERATOR_TYPES_1 = [op('equal_to', 'Equal to'), op('not_equal_to', 'Not equal to')];
export const OPERATOR_TYPES_2 = [...OPERATOR_TYPES_1, op('contains', 'Contains'), op('does_not_contain', 'Does not contain')];
export const OPERATOR_TYPES_3 = [...OPERATOR_TYPES_1, op('is_present', 'Is present'), op('is_not_present', 'Is not present')];
export const OPERATOR_TYPES_4 = [...OPERATOR_TYPES_3, op('is_greater_than', 'Is greater than'), op('is_less_than', 'Is less than')];
export const OPERATOR_TYPES_6 = [...OPERATOR_TYPES_2, op('starts_with', 'Starts With')];

const condition = (
    key: string,
    name: string,
    inputType: AutomationConditionInputType,
    filterOperators: AutomationOperatorOption[],
): AutomationConditionDefinition => ({ key, name, inputType, filterOperators });

const STATUS = condition('status', 'STATUS', 'multi_select', OPERATOR_TYPES_1);
const BROWSER_LANGUAGE = condition('browser_language', 'BROWSER_LANGUAGE', 'search_select', OPERATOR_TYPES_1);
const MAIL_SUBJECT = condition('mail_subject', 'MAIL_SUBJECT', 'plain_text', OPERATOR_TYPES_2);
const COUNTRY_CODE = condition('country_code', 'COUNTRY_NAME', 'search_select', OPERATOR_TYPES_1);
const PHONE_NUMBER = condition('phone_number', 'PHONE_NUMBER', 'plain_text', OPERATOR_TYPES_6);
const COMPANY_NAME = condition('company_name', 'COMPANY_NAME', 'plain_text', OPERATOR_TYPES_2);
const REFERER = condition('referer', 'REFERER_LINK', 'plain_text', OPERATOR_TYPES_2);
const EMAIL = condition('email', 'EMAIL', 'plain_text', OPERATOR_TYPES_2);
const INBOX = condition('inbox_id', 'INBOX', 'multi_select', OPERATOR_TYPES_1);
const CONVERSATION_LANGUAGE = condition('conversation_language', 'CONVERSATION_LANGUAGE', 'multi_select', OPERATOR_TYPES_1);
const PRIORITY = condition('priority', 'PRIORITY', 'multi_select', OPERATOR_TYPES_1);
const LABELS = condition('labels', 'LABELS', 'multi_select', OPERATOR_TYPES_3);
const ASSIGNEE = condition('assignee_id', 'ASSIGNEE_NAME', 'search_select', OPERATOR_TYPES_3);
const TEAM = condition('team_id', 'TEAM_NAME', 'search_select', OPERATOR_TYPES_3);
const MESSAGE_TYPE = condition('message_type', 'MESSAGE_TYPE', 'search_select', OPERATOR_TYPES_1);
const PRIVATE_NOTE = condition('private_note', 'PRIVATE_NOTE', 'search_select', OPERATOR_TYPES_1);
const CONTENT = condition('content', 'MESSAGE_CONTAINS', 'multi_text', OPERATOR_TYPES_2);

// Thứ tự attribute theo từng event giữ đúng gốc — dropdown hiển thị cùng thứ tự.
export const AUTOMATION_CONDITIONS: Record<string, AutomationConditionDefinition[]> = {
    message_created: [MESSAGE_TYPE, PRIVATE_NOTE, CONTENT, EMAIL, INBOX, STATUS, ASSIGNEE, TEAM, PRIORITY, CONVERSATION_LANGUAGE, PHONE_NUMBER, COMPANY_NAME, LABELS],
    conversation_created: [STATUS, BROWSER_LANGUAGE, MAIL_SUBJECT, COUNTRY_CODE, PHONE_NUMBER, COMPANY_NAME, REFERER, EMAIL, INBOX, CONVERSATION_LANGUAGE, PRIORITY, LABELS],
    conversation_updated: [STATUS, BROWSER_LANGUAGE, MAIL_SUBJECT, COUNTRY_CODE, REFERER, PHONE_NUMBER, COMPANY_NAME, ASSIGNEE, TEAM, EMAIL, INBOX, CONVERSATION_LANGUAGE, PRIORITY, LABELS],
    conversation_opened: [BROWSER_LANGUAGE, EMAIL, MAIL_SUBJECT, COUNTRY_CODE, REFERER, ASSIGNEE, PHONE_NUMBER, COMPANY_NAME, TEAM, INBOX, CONVERSATION_LANGUAGE, PRIORITY, LABELS],
    conversation_resolved: [BROWSER_LANGUAGE, EMAIL, MAIL_SUBJECT, COUNTRY_CODE, REFERER, ASSIGNEE, PHONE_NUMBER, COMPANY_NAME, TEAM, INBOX, CONVERSATION_LANGUAGE, PRIORITY],
};

export const AUTOMATION_RULE_EVENTS = [
    { key: 'conversation_created', value: 'CONVERSATION_CREATED' },
    { key: 'conversation_updated', value: 'CONVERSATION_UPDATED' },
    { key: 'conversation_resolved', value: 'CONVERSATION_RESOLVED' },
    { key: 'message_created', value: 'MESSAGE_CREATED' },
    { key: 'conversation_opened', value: 'CONVERSATION_OPENED' },
];

// Chỉ expose action đã có driver trong ActionExecutor (xem trace D1 mục "để nợ"):
// send_email_to_team (F1 mailer), send_email_transcript, send_webhook_event (D4),
// send_attachment (chưa có seam lưu trữ), add_sla (EE) bị ẩn để không sinh nút giả.
export const AUTOMATION_ACTION_TYPES: AutomationActionDefinition[] = [
    { key: 'assign_agent', label: 'ASSIGN_AGENT', inputType: 'search_select' },
    { key: 'assign_team', label: 'ASSIGN_TEAM', inputType: 'search_select' },
    { key: 'remove_assigned_agent', label: 'REMOVE_ASSIGNED_AGENT', inputType: null },
    { key: 'remove_assigned_team', label: 'REMOVE_ASSIGNED_TEAM', inputType: null },
    { key: 'add_label', label: 'ADD_LABEL', inputType: 'multi_select' },
    { key: 'remove_label', label: 'REMOVE_LABEL', inputType: 'multi_select' },
    { key: 'mute_conversation', label: 'MUTE_CONVERSATION', inputType: null },
    { key: 'snooze_conversation', label: 'SNOOZE_CONVERSATION', inputType: null },
    { key: 'resolve_conversation', label: 'RESOLVE_CONVERSATION', inputType: null },
    { key: 'open_conversation', label: 'OPEN_CONVERSATION', inputType: null },
    { key: 'pending_conversation', label: 'PENDING_CONVERSATION', inputType: null },
    { key: 'send_message', label: 'SEND_MESSAGE', inputType: 'textarea' },
    { key: 'add_private_note', label: 'ADD_PRIVATE_NOTE', inputType: 'textarea' },
    { key: 'change_priority', label: 'CHANGE_PRIORITY', inputType: 'search_select' },
];

// Icon theo action — dùng chung với action picker của Macros (automationHelper.js gốc).
const ACTION_ICONS: Record<string, string> = {
    assign_agent: 'i-lucide-user-round',
    assign_team: 'i-lucide-users-round',
    remove_assigned_agent: 'i-lucide-user-round-x',
    remove_assigned_team: 'i-lucide-users',
    add_label: 'i-lucide-tag',
    remove_label: 'i-woot-tag-remove',
    send_email_to_team: 'i-lucide-send',
    send_email_transcript: 'i-lucide-mail',
    send_message: 'i-lucide-message-square',
    add_private_note: 'i-lucide-sticky-note',
    send_attachment: 'i-lucide-paperclip',
    send_webhook_event: 'i-lucide-webhook',
    mute_conversation: 'i-lucide-bell-off',
    snooze_conversation: 'i-lucide-clock',
    open_conversation: 'i-lucide-circle-dot',
    pending_conversation: 'i-lucide-circle-dashed',
    resolve_conversation: 'i-lucide-circle-check',
    change_priority: 'i-lucide-signal-high',
    add_sla: 'i-lucide-gauge',
};
const DEFAULT_ACTION_ICON = 'i-lucide-zap';
export const getActionIcon = (key: string): string => ACTION_ICONS[key] ?? DEFAULT_ACTION_ICON;

const defaultCondition = (attributeKey: string): AutomationCondition => ({
    attribute_key: attributeKey,
    filter_operator: 'equal_to',
    values: '',
    query_operator: 'and',
    custom_attribute_type: '',
});

export const getDefaultConditions = (eventName: string): AutomationCondition[] => {
    if (eventName === 'message_created') return [defaultCondition('message_type')];
    if (eventName === 'conversation_opened' || eventName === 'conversation_resolved') return [defaultCondition('browser_language')];
    return [defaultCondition('status')];
};

export const getDefaultActions = (): AutomationAction[] => [{ action_name: 'assign_agent', action_params: [] }];

export const MESSAGE_CONDITION_VALUES = [
    { id: 'incoming', name: 'Incoming', i18nKey: 'INCOMING' },
    { id: 'outgoing', name: 'Outgoing', i18nKey: 'OUTGOING' },
];

export const PRIORITY_CONDITION_VALUES = [
    { id: 'nil', name: 'None', i18nKey: 'NONE' },
    { id: 'low', name: 'Low', i18nKey: 'LOW' },
    { id: 'medium', name: 'Medium', i18nKey: 'MEDIUM' },
    { id: 'high', name: 'High', i18nKey: 'HIGH' },
    { id: 'urgent', name: 'Urgent', i18nKey: 'URGENT' },
];

export const DEFAULT_DELAY_MINUTES = 240;
export const MIN_DELAY_MINUTES = 10;
export const MAX_DELAY_MINUTES = 43200;
export const DEFAULT_TRIGGER_STATUS = 'pending';

// Rule chạy sau chờ được diễn đạt bằng một trigger có nghĩa thay vì event + điều
// kiện thô; mỗi trigger ứng với event_name và điều kiện preset tương ứng.
export interface DelayedTrigger {
    key: 'conversation_status' | 'customer_unresponsive' | 'agent_unresponsive';
    eventName: string;
    messageType?: 'incoming' | 'outgoing';
}

export const DELAYED_TRIGGERS: DelayedTrigger[] = [
    { key: 'conversation_status', eventName: 'conversation_updated' },
    { key: 'customer_unresponsive', eventName: 'message_created', messageType: 'outgoing' },
    { key: 'agent_unresponsive', eventName: 'message_created', messageType: 'incoming' },
];

export const DEFAULT_TRIGGER = DELAYED_TRIGGERS[0].key;
