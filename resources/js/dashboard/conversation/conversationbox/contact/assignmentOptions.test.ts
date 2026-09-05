import { describe, expect, it } from 'vitest';

import {
    buildTeamsList,
    resolveAgentSelection,
    resolveAssignedAgent,
    resolveTeamSelection,
    shouldShowSelfAssign,
} from './assignmentOptions';
import type { AssignableAgent } from 'dashboard/composables/useAgentsList';
import type { TeamMeta } from '../../types';

const agent = (id: number, name = `Agent ${id}`): AssignableAgent => ({ id, name });
const team = (id: number, name = `Team ${id}`): TeamMeta => ({ id, name });

describe('assignmentOptions — assignee', () => {
    it('gắn assignee_type mặc định User khi conversation không mang giá trị', () => {
        expect(resolveAssignedAgent(agent(3), undefined)).toEqual({
            id: 3,
            name: 'Agent 3',
            availability_status: undefined,
            assignee_type: 'User',
        });
    });

    it('giữ assignee_type của conversation khi có', () => {
        expect(resolveAssignedAgent(agent(3), 'AgentBot')?.assignee_type).toBe('AgentBot');
    });

    it('chưa gán ai thì không có assignedAgent', () => {
        expect(resolveAssignedAgent(undefined, undefined)).toBeNull();
    });
});

describe('assignmentOptions — Self-assign', () => {
    it('hiện khi chưa gán ai', () => {
        expect(shouldShowSelfAssign(null, 7)).toBe(true);
    });

    it('hiện khi đang gán cho người khác', () => {
        expect(shouldShowSelfAssign(resolveAssignedAgent(agent(3), undefined), 7)).toBe(true);
    });

    it('ẩn khi đang gán cho chính mình', () => {
        expect(shouldShowSelfAssign(resolveAssignedAgent(agent(7), undefined), 7)).toBe(false);
    });

    it('hiện khi trùng id nhưng assignee là AgentBot', () => {
        expect(shouldShowSelfAssign(resolveAssignedAgent(agent(7), 'AgentBot'), 7)).toBe(true);
    });
});

describe('assignmentOptions — chọn agent', () => {
    it('bấm lại đúng agent đang gán thì gỡ', () => {
        const assigned = resolveAssignedAgent(agent(3), undefined);
        expect(resolveAgentSelection(assigned, { ...agent(3), assignee_type: 'User' })).toBeNull();
    });

    it('cùng id nhưng khác assignee_type thì vẫn là gán mới', () => {
        const assigned = resolveAssignedAgent(agent(3), 'AgentBot');
        const selected = { ...agent(3), assignee_type: 'User' };
        expect(resolveAgentSelection(assigned, selected)).toBe(selected);
    });

    it('chọn mục None (id 0) khi đang gán người khác thì trả về chính mục None', () => {
        const assigned = resolveAssignedAgent(agent(3), undefined);
        const none = { id: 0, name: 'None' };
        expect(resolveAgentSelection(assigned, none)).toBe(none);
    });
});

describe('assignmentOptions — teams', () => {
    const teams = [team(1), team(2)];

    it('chưa gán team thì danh sách không có mục None', () => {
        expect(buildTeamsList(teams, false, 'None')).toEqual(teams);
    });

    it('đã gán team thì chèn mục None lên đầu', () => {
        expect(buildTeamsList(teams, true, 'None')).toEqual([{ id: 0, name: 'None' }, ...teams]);
    });

    it('bấm lại team đang gán thì gỡ', () => {
        expect(resolveTeamSelection(team(2), team(2))).toBeNull();
    });

    it('chọn team khác thì đổi sang team đó', () => {
        const selected = team(1);
        expect(resolveTeamSelection(team(2), selected)).toBe(selected);
    });
});
