import { createElement } from 'react';
import type { ReactNode } from 'react';

import { t } from '../../../i18n';

// Port từ components-next/filter/operators.js (useOperators → hàm thuần).
export const FILTER_OPS = {
    EQUAL_TO: 'equal_to',
    NOT_EQUAL_TO: 'not_equal_to',
    IS_PRESENT: 'is_present',
    IS_NOT_PRESENT: 'is_not_present',
    CONTAINS: 'contains',
    DOES_NOT_CONTAIN: 'does_not_contain',
    IS_GREATER_THAN: 'is_greater_than',
    IS_LESS_THAN: 'is_less_than',
    DAYS_BEFORE: 'days_before',
    STARTS_WITH: 'starts_with',
} as const;

type FilterOp = (typeof FILTER_OPS)[keyof typeof FILTER_OPS];

const NO_INPUT_OPTS: string[] = [FILTER_OPS.IS_PRESENT, FILTER_OPS.IS_NOT_PRESENT];

const OPS_INPUT_OVERRIDE: Partial<Record<FilterOp, string>> = {
    [FILTER_OPS.DAYS_BEFORE]: 'plainText',
};

const filterOperatorIcon: Record<FilterOp, string> = {
    [FILTER_OPS.EQUAL_TO]: 'i-ph-equals-bold',
    [FILTER_OPS.NOT_EQUAL_TO]: 'i-ph-not-equals-bold',
    [FILTER_OPS.IS_PRESENT]: 'i-ph-member-of-bold',
    [FILTER_OPS.IS_NOT_PRESENT]: 'i-ph-not-member-of-bold',
    [FILTER_OPS.CONTAINS]: 'i-ph-superset-of-bold',
    [FILTER_OPS.DOES_NOT_CONTAIN]: 'i-ph-not-superset-of-bold',
    [FILTER_OPS.IS_GREATER_THAN]: 'i-ph-greater-than-bold',
    [FILTER_OPS.IS_LESS_THAN]: 'i-ph-less-than-bold',
    [FILTER_OPS.DAYS_BEFORE]: 'i-ph-calendar-minus-bold',
    [FILTER_OPS.STARTS_WITH]: 'i-ph-caret-line-right-bold',
};

export interface FilterOperator {
    value: string;
    label: string;
    icon: ReactNode;
    inputOverride: string | null;
    hasInput: boolean;
}

const buildOperator = (value: FilterOp): FilterOperator => ({
    value,
    label: t(`FILTER.OPERATOR_LABELS.${value}`),
    hasInput: !NO_INPUT_OPTS.includes(value),
    inputOverride: OPS_INPUT_OVERRIDE[value] ?? null,
    icon: createElement('span', { className: `${filterOperatorIcon[value]} !text-n-blue-11` }),
});

export const operators: Record<string, FilterOperator> = Object.fromEntries(
    Object.values(FILTER_OPS).map(value => [value, buildOperator(value)]),
);

export const equalityOperators = [operators[FILTER_OPS.EQUAL_TO], operators[FILTER_OPS.NOT_EQUAL_TO]];

export const presenceOperators = [
    operators[FILTER_OPS.EQUAL_TO],
    operators[FILTER_OPS.NOT_EQUAL_TO],
    operators[FILTER_OPS.IS_PRESENT],
    operators[FILTER_OPS.IS_NOT_PRESENT],
];

export const containmentOperators = [
    operators[FILTER_OPS.EQUAL_TO],
    operators[FILTER_OPS.NOT_EQUAL_TO],
    operators[FILTER_OPS.CONTAINS],
    operators[FILTER_OPS.DOES_NOT_CONTAIN],
];

export const comparisonOperators = [
    operators[FILTER_OPS.EQUAL_TO],
    operators[FILTER_OPS.NOT_EQUAL_TO],
    operators[FILTER_OPS.IS_PRESENT],
    operators[FILTER_OPS.IS_NOT_PRESENT],
    operators[FILTER_OPS.IS_GREATER_THAN],
    operators[FILTER_OPS.IS_LESS_THAN],
];

export const dateOperators = [
    operators[FILTER_OPS.IS_GREATER_THAN],
    operators[FILTER_OPS.IS_LESS_THAN],
    operators[FILTER_OPS.DAYS_BEFORE],
];

export const getOperatorTypes = (key: string): FilterOperator[] => {
    switch (key) {
        case 'text':
            return containmentOperators;
        case 'date':
            return comparisonOperators;
        case 'list':
        case 'number':
        case 'link':
        case 'checkbox':
        default:
            return equalityOperators;
    }
};
