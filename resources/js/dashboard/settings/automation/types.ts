import type { FilterOption } from 'dashboard/components-next/filter/helper/filterHelper';

// Trạng thái form giữ đúng hình dạng của gốc: values là chuỗi (plain_text),
// FilterOption (search_select) hoặc FilterOption[] (multi_select) khi đang sửa,
// và được generateAutomationPayload đưa về mảng id thuần khi gửi API.
export type AutomationConditionValue = string | number | boolean | FilterOption | FilterOption[] | null | Record<string, never>;

export interface AutomationCondition {
    attribute_key: string;
    filter_operator: string;
    values: AutomationConditionValue | unknown;
    query_operator: 'and' | 'or' | null;
    custom_attribute_type?: string;
}

export interface AutomationAction {
    action_name: string;
    action_params: unknown;
}

export interface AutomationRule {
    id: number;
    account_id: number;
    name: string | null;
    description: string | null;
    event_name: string;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    created_on: number | null;
    active: boolean;
    execution_delay: number | null;
    files?: Array<{ blob_id: string; filename: string }>;
}

export interface AutomationOptionSets {
    agents: FilterOption[];
    teams: FilterOption[];
    inboxes: FilterOption[];
    labels: FilterOption[];
}
