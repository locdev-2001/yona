import { describe, expect, it } from 'vitest';
import { resetConditionForAttribute } from '../ConditionRow';
import { equalityOperators } from '../operators';
import { groupFilterTypes } from './filterAttributeIcons';
import type { FilterType } from './filterHelper';
import { selectableFilterTypes } from './filterVisibility';

const filterType = (attributeKey: string, attributeModel: FilterType['attributeModel'] = 'standard'): FilterType => ({
    attributeKey,
    value: attributeKey,
    attributeName: attributeKey,
    label: attributeKey,
    attributeModel,
    inputType: 'plainText',
    dataType: 'text',
    filterOperators: equalityOperators,
});

describe('lựa chọn bộ lọc tinh gọn', () => {
    it('giữ lọc lõi, ẩn nhóm/ưu tiên/chiến dịch và thuộc tính tuỳ biến cùng tiêu đề rỗng', () => {
        const definitions = groupFilterTypes([
            filterType('status'), filterType('name'), filterType('phone_number'), filterType('labels'),
            filterType('team_id'), filterType('priority'), filterType('campaign_id'),
            filterType('muc_chi_tieu', 'customAttributes'),
        ]);
        expect(selectableFilterTypes(definitions).map(option => option.value)).toEqual([
            '__group_standard', 'status', 'name', 'phone_number', 'labels',
        ]);
        expect(definitions.some(option => option.value === 'muc_chi_tieu')).toBe(true);
        expect(resetConditionForAttribute(definitions, {
            attributeKey: 'muc_chi_tieu', filterOperator: 'equal_to', values: '500', queryOperator: 'and',
        }, 'muc_chi_tieu').attributeKey).toBe('muc_chi_tieu');
    });
});
