import type { ReactNode } from 'react';

import type { FilterOperator } from '../operators';

// Port từ components-next/filter/helper/filterHelper.js.
export const DROPDOWN_SEARCH_THRESHOLD = 8;

export const CONVERSATION_ATTRIBUTES = {
    STATUS: 'status',
    PRIORITY: 'priority',
    ASSIGNEE_ID: 'assignee_id',
    INBOX_ID: 'inbox_id',
    TEAM_ID: 'team_id',
    CONTACT_ID: 'contact_id',
    DISPLAY_ID: 'display_id',
    CAMPAIGN_ID: 'campaign_id',
    LABELS: 'labels',
    BROWSER_LANGUAGE: 'browser_language',
    REFERER: 'referer',
    CREATED_AT: 'created_at',
    LAST_ACTIVITY_AT: 'last_activity_at',
} as const;

export interface FilterOption {
    id: string | number | boolean;
    name: string;
    icon?: ReactNode;
    color?: string;
}

export type FilterInputType =
    | 'multiSelect'
    | 'searchSelect'
    | 'asyncSearchSelect'
    | 'plainText'
    | 'date'
    | 'number'
    | 'booleanSelect'
    | 'multiText';

export interface FilterType {
    attributeKey: string;
    value: string;
    attributeName: string;
    label: string;
    inputType: FilterInputType;
    options?: FilterOption[];
    searchOptions?: (query: string) => Promise<FilterOption[] | null>;
    searchPlaceholder?: string;
    dataType: 'text' | 'number';
    filterOperators: FilterOperator[];
    attributeModel: 'standard' | 'additional' | 'customAttributes';
    attributeDisplayType?: string;
    icon?: ReactNode;
    disabled?: boolean;
}

// Đơn vị hiển thị trong FilterSelect: header nhóm (disabled) hoặc attribute.
export interface FilterSelectOption {
    value: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
}

export type FilterValue = string | number | FilterOption | FilterOption[] | null | Record<string, never>;

export interface ConversationFilterCondition {
    attributeKey: string;
    filterOperator: string;
    values: FilterValue;
    queryOperator: 'and' | 'or';
}

export const replaceUnderscoreWithSpace = (text?: string | null): string => text?.replaceAll('_', ' ') ?? '';
