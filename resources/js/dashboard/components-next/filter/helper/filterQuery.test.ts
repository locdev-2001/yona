import { describe, expect, it } from 'vitest';

import { buildConversationFilterPayload } from './filterQuery';

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
