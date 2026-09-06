import { describe, expect, it } from 'vitest';

import type { CamelCustomAttribute } from 'dashboard/composables/useCustomAttributes';
import {
    buildAttributesFilterTypes,
    getCustomAttributeInputType,
    replaceUnderscoreWithSpace,
} from './filterHelper';
import type { FilterOperator } from '../operators';

// Port từ components-next/filter/helper/filterHelper.spec.js.
// Phần useConversationFilterContext của spec gốc không port: provider của bản
// port là hook React đọc Inertia props, đã có gate pixel-diff + e2e phủ.
const attribute = (overrides: Partial<CamelCustomAttribute>): CamelCustomAttribute => ({
    id: 1,
    attributeDisplayName: '',
    attributeDisplayType: 'text',
    attributeDescription: null,
    attributeKey: '',
    attributeValues: [],
    attributeModel: 'conversation_attribute',
    ...overrides,
});

const operatorsOf = (type: string) =>
    (type === 'list'
        ? [{ value: 'is' }, { value: 'is_not' }]
        : [{ value: 'contains' }, { value: 'not_contains' }]) as FilterOperator[];

describe('getCustomAttributeInputType', () => {
    it('trả date cho kiểu date', () => {
        expect(getCustomAttributeInputType('date')).toBe('date');
    });

    it('trả plainText cho kiểu text', () => {
        expect(getCustomAttributeInputType('text')).toBe('plainText');
    });

    it('trả searchSelect cho kiểu list', () => {
        expect(getCustomAttributeInputType('list')).toBe('searchSelect');
    });

    it('trả booleanSelect cho kiểu checkbox', () => {
        expect(getCustomAttributeInputType('checkbox')).toBe('booleanSelect');
    });

    it('trả plainText cho kiểu lạ', () => {
        expect(getCustomAttributeInputType('unknown')).toBe('plainText');
    });
});

describe('buildAttributesFilterTypes', () => {
    it('dựng filter type cho thuộc tính text', () => {
        const result = buildAttributesFilterTypes(
            [
                attribute({
                    attributeKey: 'test_key',
                    attributeDisplayName: 'Test Name',
                    attributeDisplayType: 'text',
                }),
            ],
            operatorsOf,
        );

        expect(result).toEqual([
            {
                attributeKey: 'test_key',
                value: 'test_key',
                attributeName: 'Test Name',
                label: 'Test Name',
                inputType: 'plainText',
                attributeDisplayType: 'text',
                filterOperators: [{ value: 'contains' }, { value: 'not_contains' }],
                options: [],
                dataType: 'text',
                attributeModel: 'customAttributes',
            },
        ]);
    });

    it('dựng filter type cho thuộc tính list kèm lựa chọn', () => {
        const result = buildAttributesFilterTypes(
            [
                attribute({
                    attributeKey: 'list_key',
                    attributeDisplayName: 'List Name',
                    attributeDisplayType: 'list',
                    attributeValues: ['option1', 'option2'],
                }),
            ],
            operatorsOf,
        );

        expect(result[0].inputType).toBe('searchSelect');
        expect(result[0].options).toEqual([
            { id: 'option1', name: 'option1' },
            { id: 'option2', name: 'option2' },
        ]);
        expect(result[0].filterOperators).toEqual([{ value: 'is' }, { value: 'is_not' }]);
    });

    it('xử lý nhiều thuộc tính', () => {
        const result = buildAttributesFilterTypes(
            [
                attribute({ attributeKey: 'date_key', attributeDisplayType: 'date' }),
                attribute({ attributeKey: 'checkbox_key', attributeDisplayType: 'checkbox' }),
            ],
            operatorsOf,
        );

        expect(result).toHaveLength(2);
        expect(result[0].inputType).toBe('date');
        expect(result[1].inputType).toBe('booleanSelect');
    });

    it('trả mảng rỗng khi không có thuộc tính', () => {
        expect(buildAttributesFilterTypes([], operatorsOf)).toEqual([]);
    });

    it('bỏ thuộc tính trùng khoá với thuộc tính chuẩn của từng model', () => {
        const attributes = [
            attribute({ attributeKey: 'status' }),
            attribute({ attributeKey: 'city' }),
            attribute({ attributeKey: 'plan' }),
        ];

        expect(buildAttributesFilterTypes(attributes, operatorsOf, 'conversation').map(item => item.attributeKey)).toEqual(
            ['city', 'plan'],
        );
        expect(buildAttributesFilterTypes(attributes, operatorsOf, 'contact').map(item => item.attributeKey)).toEqual([
            'status',
            'plan',
        ]);
    });
});

describe('replaceUnderscoreWithSpace', () => {
    it('đổi gạch dưới thành khoảng trắng', () => {
        expect(replaceUnderscoreWithSpace('test_key')).toBe('test key');
    });

    it('trả chuỗi rỗng khi đầu vào null', () => {
        expect(replaceUnderscoreWithSpace(null)).toBe('');
    });
});
