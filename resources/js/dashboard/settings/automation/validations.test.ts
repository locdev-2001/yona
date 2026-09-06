import { describe, expect, it } from 'vitest';

import { ACTION_PARAMETERS_REQUIRED, ATLEAST_ONE_ACTION_REQUIRED, ATLEAST_ONE_CONDITION_REQUIRED, validateAutomation } from './validations';

const validRule = () => ({
    name: 'Assign pricing',
    description: 'Route pricing questions',
    event_name: 'message_created',
    conditions: [{ attribute_key: 'content', filter_operator: 'contains', values: 'giá', query_operator: null }],
    actions: [{ action_name: 'assign_team', action_params: [{ id: 1, name: 'Sales' }] }],
});

describe('validateAutomation', () => {
    it('trả về rỗng khi rule hợp lệ', () => {
        expect(validateAutomation(validRule())).toEqual({});
    });

    it('bắt thiếu name/description/event như gốc', () => {
        const errors = validateAutomation({ ...validRule(), name: ' ', description: null, event_name: '' });
        expect(errors).toMatchObject({ name: true, description: true, event_name: true });
    });

    it('đòi ít nhất một điều kiện và một hành động', () => {
        const errors = validateAutomation({ ...validRule(), conditions: [], actions: [] });
        expect(errors.conditions).toBe(ATLEAST_ONE_CONDITION_REQUIRED);
        expect(errors.actions).toBe(ATLEAST_ONE_ACTION_REQUIRED);
    });

    it('condition_N: is_present không cần value, equal_to rỗng thì báo VALUE_REQUIRED', () => {
        const errors = validateAutomation({
            ...validRule(),
            conditions: [
                { attribute_key: 'assignee_id', filter_operator: 'is_present', values: '', query_operator: 'and' },
                { attribute_key: 'status', filter_operator: 'equal_to', values: [], query_operator: 'and' },
                { attribute_key: 'private_note', filter_operator: 'equal_to', values: {}, query_operator: null },
            ],
        });
        expect(errors.condition_0).toBeUndefined();
        expect(errors.condition_1).toBe('VALUE_REQUIRED');
        expect(errors.condition_2).toBe('VALUE_REQUIRED');
    });

    it('action_N: action không tham số được bỏ qua, action cần tham số rỗng thì báo lỗi', () => {
        const errors = validateAutomation({
            ...validRule(),
            actions: [
                { action_name: 'resolve_conversation', action_params: [] },
                { action_name: 'add_label', action_params: [] },
                { action_name: 'send_message', action_params: '' },
            ],
        });
        expect(errors.action_0).toBeUndefined();
        expect(errors.action_1).toBe(ACTION_PARAMETERS_REQUIRED);
        expect(errors.action_2).toBe(ACTION_PARAMETERS_REQUIRED);
    });
});
