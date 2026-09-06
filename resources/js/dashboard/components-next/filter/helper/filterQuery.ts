import type { ConversationFilterCondition, FilterOption } from './filterHelper';

export interface ConversationFilterPayload {
    attribute_key: string;
    filter_operator: string;
    values: Array<string | number | boolean>;
    query_operator?: 'and' | 'or';
}

const optionValue = (value: unknown): string | number | boolean | null => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }
    if (value && typeof value === 'object' && !Array.isArray(value) && 'id' in value) {
        return (value as FilterOption).id;
    }

    return null;
};

// filterQueryGenerator.js của Chatwoot: UI giữ cả object option để hiển thị,
// API chỉ nhận id/value; connector AND/OR nằm ở mọi dòng trừ dòng cuối.
export function buildConversationFilterPayload(
    filters: ConversationFilterCondition[],
): ConversationFilterPayload[] {
    return filters.map((filter, index) => {
        const rawValues = Array.isArray(filter.values) ? filter.values : [filter.values];
        const values = rawValues
            .map(optionValue)
            .filter((value): value is string | number | boolean => value !== null);

        return {
            attribute_key: filter.attributeKey,
            filter_operator: filter.filterOperator,
            values,
            ...(index < filters.length - 1 ? { query_operator: filter.queryOperator } : {}),
        };
    });
}
