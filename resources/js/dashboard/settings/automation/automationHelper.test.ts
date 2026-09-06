import { describe, expect, it } from 'vitest';

import { buildFilterTypes, formatAutomation, formatDelay, generateAutomationPayload, getActionDropdownValues, showActionInput } from './automationHelper';
import type { AutomationOptionSets, AutomationRule } from './types';

const optionSets: AutomationOptionSets = {
    agents: [{ id: 7, name: 'Sam' }],
    teams: [{ id: 3, name: 'Sales' }],
    inboxes: [{ id: 1, name: 'api-test' }],
    labels: [{ id: 'billing', name: 'billing', color: '#111111' }],
};

const savedRule: AutomationRule = {
    id: 9,
    account_id: 2,
    name: 'Pricing',
    description: 'Route pricing',
    event_name: 'message_created',
    conditions: [
        { attribute_key: 'content', filter_operator: 'contains', values: ['giá'], query_operator: 'and' },
        { attribute_key: 'inbox_id', filter_operator: 'equal_to', values: [1], query_operator: 'or' },
        { attribute_key: 'private_note', filter_operator: 'equal_to', values: [false], query_operator: 'and' },
        { attribute_key: 'assignee_id', filter_operator: 'equal_to', values: [7], query_operator: null },
    ],
    actions: [
        { action_name: 'assign_team', action_params: [3] },
        { action_name: 'add_label', action_params: ['billing'] },
        { action_name: 'send_message', action_params: ['Xin chào'] },
        { action_name: 'resolve_conversation', action_params: [] },
    ],
    created_on: 1,
    active: true,
    execution_delay: null,
};

describe('formatAutomation ↔ generateAutomationPayload', () => {
    it('hydrate id thuần thành option rồi sinh lại đúng payload ban đầu (round-trip)', () => {
        const formatted = formatAutomation(savedRule, optionSets);

        expect(formatted.conditions[0].values).toEqual(['giá']);
        expect(formatted.conditions[1].values).toEqual([{ id: 1, name: 'api-test' }]);
        expect(formatted.conditions[2].values).toEqual({ id: false, name: expect.any(String) });
        expect(formatted.conditions[3].values).toEqual({ id: 7, name: 'Sam' });
        expect(formatted.actions[0].action_params).toEqual([{ id: 3, name: 'Sales' }]);
        expect(formatted.actions[1].action_params).toEqual([{ id: 'billing', name: 'billing', color: '#111111' }]);

        const payload = generateAutomationPayload(formatted);
        expect(payload.conditions.map(condition => condition.values)).toEqual([['giá'], [1], [false], [7]]);
        expect(payload.conditions.map(condition => condition.query_operator)).toEqual(['and', 'or', 'and', null]);
        expect(payload.actions.map(action => action.action_params)).toEqual([[3], ['billing'], ['Xin chào'], []]);
    });

    it('điều kiện tạo mới: chuỗi rỗng → [], chuỗi thường → [chuỗi]', () => {
        const payload = generateAutomationPayload({
            name: 'a',
            description: 'b',
            event_name: 'conversation_created',
            execution_delay: null,
            conditions: [
                { attribute_key: 'email', filter_operator: 'contains', values: '', query_operator: 'and' },
                { attribute_key: 'email', filter_operator: 'contains', values: 'acme', query_operator: 'and' },
            ],
            actions: [{ action_name: 'send_message', action_params: 'hi' }],
        });
        expect(payload.conditions[0].values).toEqual([]);
        expect(payload.conditions[1].values).toEqual(['acme']);
        expect(payload.conditions[1].query_operator).toBeNull();
        expect(payload.actions[0].action_params).toEqual(['hi']);
    });
});

describe('buildFilterTypes', () => {
    it('map inputType gốc sang ConditionRow và làm giàu operator từ bộ chung', () => {
        const types = buildFilterTypes('message_created', optionSets);
        const content = types.find(item => item.attributeKey === 'content');
        const inbox = types.find(item => item.attributeKey === 'inbox_id');
        expect(content?.inputType).toBe('multiText');
        expect(inbox?.inputType).toBe('multiSelect');
        expect(inbox?.options).toEqual(optionSets.inboxes);
        expect(content?.filterOperators.map(operator => operator.value)).toEqual(['equal_to', 'not_equal_to', 'contains', 'does_not_contain']);
        expect(content?.filterOperators[0].hasInput).toBe(true);
    });
});

describe('action helpers', () => {
    it('assign_agent/assign_team có option None đứng đầu', () => {
        expect(getActionDropdownValues('assign_agent', optionSets)[0].id).toBe('nil');
        expect(getActionDropdownValues('add_label', optionSets)).toEqual(optionSets.labels);
    });

    it('showActionInput ẩn input hàng ngang cho send_message và action không tham số', () => {
        expect(showActionInput('send_message')).toBe(false);
        expect(showActionInput('resolve_conversation')).toBe(false);
        expect(showActionInput('add_label')).toBe(true);
    });

    it('formatDelay chọn đơn vị lớn nhất chia hết', () => {
        expect(formatDelay(240)).toBe('4h');
        expect(formatDelay(2880)).toBe('2d');
        expect(formatDelay(45)).toBe('45m');
    });
});

describe('hành động gửi thư cho đội', () => {
    const teamRule: AutomationRule = {
        ...savedRule,
        actions: [{ action_name: 'send_email_to_team', action_params: [{ team_ids: [3], message: 'Vào xem nhé' }] }],
    };

    it('hydrate team_ids thành option rồi sinh lại đúng id thuần (round-trip)', () => {
        const formatted = formatAutomation(teamRule, optionSets);

        expect(formatted.actions[0].action_params).toEqual({ team_ids: [{ id: 3, name: 'Sales' }], message: 'Vào xem nhé' });
        expect(generateAutomationPayload(formatted).actions).toEqual(teamRule.actions);
    });

    it('dropdown lấy danh sách đội và không vẽ ô nhập trên cùng hàng', () => {
        expect(getActionDropdownValues('send_email_to_team', optionSets)).toEqual(optionSets.teams);
        expect(showActionInput('send_email_to_team')).toBe(false);
    });
});
