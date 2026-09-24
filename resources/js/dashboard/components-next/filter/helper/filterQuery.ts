import type { ConversationFilterCondition, FilterOption, FilterType, FilterValue } from './filterHelper';

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

// Bộ sinh truy vấn lọc: UI giữ cả object option để hiển thị,
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

// Chiều ngược của buildConversationFilterPayload: query đã lưu của folder/segment
// → các dòng điều kiện để mở lại trong modal bộ lọc.
// Thay helper/customViewsHelper.js của gốc (switch theo attribute_key): ở đây
// nguồn duy nhất là danh sách FilterType của provider, nên custom attribute cũng
// tự hiện đúng tên mà không cần thêm nhánh nào.
export function conditionsFromPayload(
    payload: ConversationFilterPayload[],
    filterTypes: (FilterType | { value: string })[],
): ConversationFilterCondition[] {
    const typeOf = (attributeKey: string): FilterType | undefined =>
        filterTypes.find((type): type is FilterType => 'attributeKey' in type && type.attributeKey === attributeKey);

    const optionFor = (type: FilterType | undefined, value: string | number | boolean): FilterOption =>
        type?.options?.find(option => option.id === value) ?? { id: value, name: String(value) };

    return payload.map(item => {
        const type = typeOf(item.attribute_key);
        const inputType = type?.inputType ?? 'plainText';
        const values: FilterValue =
            inputType === 'multiSelect'
                ? item.values.map(value => optionFor(type, value))
                : ['searchSelect', 'asyncSearchSelect', 'booleanSelect'].includes(inputType)
                  ? optionFor(type, item.values[0])
                  : String(item.values[0] ?? '');

        return {
            attributeKey: item.attribute_key,
            filterOperator: item.filter_operator,
            values,
            queryOperator: item.query_operator ?? 'and',
        };
    });
}
