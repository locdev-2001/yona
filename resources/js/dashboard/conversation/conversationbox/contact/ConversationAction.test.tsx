import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const assignment = vi.hoisted(() => ({ assignAgent: vi.fn(), assignTeam: vi.fn(), togglePriority: vi.fn(), useAgentsList: vi.fn(() => ({ agentsList: [] })) }));
vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: { auth: { user: { id: 1, name: 'Lan' } }, currentAccount: { id: 2 }, currentAccountUser: { role: 'administrator' } } }) }));
vi.mock('../../ConversationContext', () => ({ useConversation: () => ({ ...assignment, selectedConversation: { id: 4, priority: 'urgent', meta: { assignee: { id: 9, name: 'Bot đang xử lý' }, assignee_type: 'AgentBot', team: { id: 5, name: 'Đội bán hàng' } } } }) }));
vi.mock('dashboard/composables/useAgentsList', () => ({ useAgentsList: assignment.useAgentsList }));
vi.mock('./useTeamsList', () => ({ useTeamsList: () => [] }));
vi.mock('./LabelBox', () => ({ default: () => <div>Nhãn</div> }));
vi.mock('./ContactDetailsItem', () => ({ default: ({ title, button }: { title: string; button?: ReactNode }) => <div>{title}{button}</div> }));
vi.mock('shared/components/ui/MultiselectDropdown', () => ({ default: ({ selectedItem }: { selectedItem: { name: string } | null }) => <div data-testid="assignee">{selectedItem?.name}</div> }));

import ConversationAction from './ConversationAction';

describe('Tác vụ hội thoại tinh gọn', () => {
    it('giữ bot đang gán và nhãn, ẩn team/priority mà không thay đổi giá trị lưu', () => {
        render(<ConversationAction />);
        expect(screen.getAllByTestId('assignee')).toHaveLength(1);
        expect(screen.getByText('Bot đang xử lý')).toBeTruthy();
        expect(screen.getByText('Nhãn')).toBeTruthy();
        expect(screen.queryByText('Đội bán hàng')).toBeNull();
        expect(assignment.useAgentsList).toHaveBeenCalledWith(true, { includeAgentBots: false });
        expect(assignment.assignAgent).not.toHaveBeenCalled();
        expect(assignment.assignTeam).not.toHaveBeenCalled();
        expect(assignment.togglePriority).not.toHaveBeenCalled();
    });
});
