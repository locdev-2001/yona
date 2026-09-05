import { describe, expect, it } from 'vitest';

import {
    buildAgentsList,
    createNoneAgent,
    filterVerifiedAgents,
    getAgentsByUpdatedPresence,
    getSortedAgentsByAvailability,
} from './useAgentsList';
import type { AssignableAgent } from './useAgentsList';

const agent = (overrides: Partial<AssignableAgent> & { id: number }): AssignableAgent => ({
    name: `Agent ${overrides.id}`,
    confirmed: true,
    availability_status: 'offline',
    ...overrides,
});

describe('useAgentsList — lọc agent theo inbox', () => {
    it('bỏ agent chưa xác nhận', () => {
        const agents = [agent({ id: 1 }), agent({ id: 2, confirmed: false })];
        expect(filterVerifiedAgents(agents, false).map(item => item.id)).toEqual([1]);
    });

    it('giữ AgentBot chưa xác nhận khi được hỏi', () => {
        const bot = agent({ id: 9, confirmed: false, assignee_type: 'AgentBot' });
        expect(filterVerifiedAgents([bot], true).map(item => item.id)).toEqual([9]);
        expect(filterVerifiedAgents([bot], false)).toEqual([]);
    });
});

describe('useAgentsList — sắp xếp', () => {
    it('online → busy → offline, trong nhóm sắp theo tên', () => {
        const agents = [
            agent({ id: 1, name: 'Zoe', availability_status: 'online' }),
            agent({ id: 2, name: 'Bob', availability_status: 'offline' }),
            agent({ id: 3, name: 'Amy', availability_status: 'online' }),
            agent({ id: 4, name: 'Cal', availability_status: 'busy' }),
        ];
        expect(getSortedAgentsByAvailability(agents).map(item => item.name)).toEqual(['Amy', 'Zoe', 'Cal', 'Bob']);
    });

    it('trạng thái của chính mình lấy theo account đang mở', () => {
        const agents = [agent({ id: 1, availability_status: 'offline' }), agent({ id: 2 })];
        expect(getAgentsByUpdatedPresence(agents, 1, 'busy')[0].availability_status).toBe('busy');
        expect(getAgentsByUpdatedPresence(agents, 1, 'busy')[1].availability_status).toBe('offline');
    });

    it('không đổi trạng thái AgentBot trùng id với người dùng', () => {
        const agents = [agent({ id: 1, assignee_type: 'AgentBot' })];
        expect(getAgentsByUpdatedPresence(agents, 1, 'online')[0].availability_status).toBe('offline');
    });
});

describe('useAgentsList — mục None', () => {
    const base = { currentUserId: 1, currentAvailability: 'online' as const, noneLabel: 'None' };

    it('chỉ chèn None khi hội thoại đang có assignee', () => {
        const agents = [agent({ id: 2 })];
        expect(
            buildAgentsList(agents, { ...base, includeNoneAgent: true, isAgentSelected: true })[0],
        ).toEqual(createNoneAgent('None'));
        expect(buildAgentsList(agents, { ...base, includeNoneAgent: true, isAgentSelected: false })).toHaveLength(1);
        expect(buildAgentsList(agents, { ...base, includeNoneAgent: false, isAgentSelected: true })).toHaveLength(1);
    });

    it('AgentBot không tên hiện dấu gạch ngang', () => {
        const agents = [agent({ id: 9, name: '', assignee_type: 'AgentBot' })];
        expect(
            buildAgentsList(agents, { ...base, includeNoneAgent: true, isAgentSelected: false })[0].name,
        ).toBe('-');
    });
});
