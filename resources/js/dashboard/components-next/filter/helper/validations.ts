import type { ConversationFilterCondition, FilterValue } from './filterHelper';

// Port từ dashboard/helper/validations.js (validateSingleFilter).
const ATTRIBUTE_KEY_REQUIRED = 'ATTRIBUTE_KEY_REQUIRED';
const FILTER_OPERATOR_REQUIRED = 'FILTER_OPERATOR_REQUIRED';
const VALUE_REQUIRED = 'VALUE_REQUIRED';
const VALUE_MUST_BE_BETWEEN_1_AND_998 = 'VALUE_MUST_BE_BETWEEN_1_AND_998';

const isEmptyValue = (value: FilterValue): boolean => {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return String(value).trim() === '';
};

export const validateSingleFilter = (filter: ConversationFilterCondition): string | null => {
    if (!filter.attributeKey) return ATTRIBUTE_KEY_REQUIRED;
    if (!filter.filterOperator) return FILTER_OPERATOR_REQUIRED;

    const operatorRequiresValue = !['is_present', 'is_not_present'].includes(filter.filterOperator);
    if (operatorRequiresValue && isEmptyValue(filter.values)) return VALUE_REQUIRED;

    if (filter.filterOperator === 'days_before') {
        const days = parseInt(String(filter.values), 10);
        if (days <= 0 || days >= 999) return VALUE_MUST_BE_BETWEEN_1_AND_998;
    }

    return null;
};
