import { describe, expect, it } from 'vitest';

import { buildConversationFilterPayload, conditionsFromPayload } from './filterQuery';
import type { FilterType } from './filterHelper';

describe('buildConversationFilterPayload', () => {
    it('serializes option objects and leaves the last query operator out', () => {
        expect(
            buildConversationFilterPayload([
                {
                    attributeKey: 'status',
                    filterOperator: 'equal_to',
                    values: [
                        { id: 'open', name: 'Open' },
                        { id: 'snoozed', name: 'Snoozed' },
                    ],
                    queryOperator: 'or',
                },
                {
                    attributeKey: 'display_id',
                    filterOperator: 'equal_to',
                    values: 42,
                    queryOperator: 'and',
                },
            ]),
        ).toEqual([
            {
                attribute_key: 'status',
                filter_operator: 'equal_to',
                values: ['open', 'snoozed'],
                query_operator: 'or',
            },
            {
                attribute_key: 'display_id',
                filter_operator: 'equal_to',
                values: [42],
            },
        ]);
    });

    it('sends no values for presence operators', () => {
        expect(
            buildConversationFilterPayload([
                {
                    attributeKey: 'assignee_id',
                    filterOperator: 'is_not_present',
                    values: null,
                    queryOperator: 'and',
                },
            ]),
        ).toEqual([
            {
                attribute_key: 'assignee_id',
                filter_operator: 'is_not_present',
                values: [],
            },
        ]);
    });
});

describe('conditionsFromPayload', () => {
    const filterTypes: FilterType[] = [
        {
            attributeKey: 'status',
            value: 'status',
            attributeName: 'Status',
            label: 'Status',
            inputType: 'multiSelect',
            options: [
                { id: 'open', name: 'Open' },
                { id: 'snoozed', name: 'Snoozed' },
            ],
            dataType: 'text',
            filterOperators: [],
            attributeModel: 'standard',
        },
        {
            attributeKey: 'goi_quan_tam',
            value: 'goi_quan_tam',
            attributeName: 'Gói quan tâm',
            label: 'Gói quan tâm',
            inputType: 'searchSelect',
            options: [{ id: 'Premium', name: 'Premium' }],
            dataType: 'text',
            filterOperators: [],
            attributeModel: 'customAttributes',
        },
        {
            attributeKey: 'display_id',
            value: 'display_id',
            attributeName: 'Id',
            label: 'Id',
            inputType: 'number',
            dataType: 'number',
            filterOperators: [],
            attributeModel: 'standard',
        },
    ];

    it('gắn lại tên hiển thị cho lựa chọn đã lưu, kể cả custom attribute', () => {
        expect(
            conditionsFromPayload(
                [
                    {
                        attribute_key: 'status',
                        filter_operator: 'equal_to',
                        values: ['open'],
                        query_operator: 'or',
                    },
                    { attribute_key: 'goi_quan_tam', filter_operator: 'equal_to', values: ['Premium'] },
                ],
                filterTypes,
            ),
        ).toEqual([
            {
                attributeKey: 'status',
                filterOperator: 'equal_to',
                values: [{ id: 'open', name: 'Open' }],
                queryOperator: 'or',
            },
            {
                attributeKey: 'goi_quan_tam',
                filterOperator: 'equal_to',
                values: { id: 'Premium', name: 'Premium' },
                queryOperator: 'and',
            },
        ]);
    });

    it('quay vòng payload → điều kiện → payload không đổi dữ liệu', () => {
        const payload = [
            { attribute_key: 'status', filter_operator: 'equal_to', values: ['open'], query_operator: 'and' as const },
            { attribute_key: 'goi_quan_tam', filter_operator: 'equal_to', values: ['Premium'] },
        ];

        expect(buildConversationFilterPayload(conditionsFromPayload(payload, filterTypes))).toEqual(payload);
    });

    it('giữ giá trị thô khi không tìm được lựa chọn khớp', () => {
        expect(
            conditionsFromPayload(
                [{ attribute_key: 'display_id', filter_operator: 'equal_to', values: [42] }],
                filterTypes,
            ),
        ).toEqual([
            { attributeKey: 'display_id', filterOperator: 'equal_to', values: '42', queryOperator: 'and' },
        ]);
    });
});
