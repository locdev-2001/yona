import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const avatarRender = vi.hoisted(() => vi.fn());
vi.mock('dashboard/components-next/avatar/Avatar', () => ({
    default: (props: { name: string }) => {
        avatarRender(props.name);
        return <span data-testid="avatar">{props.name}</span>;
    },
}));

import { AssigneeAvatar, assigneeKind } from './AssigneeIdentity';

describe('người phụ trách', () => {
    it.each([
        { assignee: { id: 2, name: 'Lan' }, isAgentBot: false, kind: 'me' },
        { assignee: { id: 2, name: 'Bot' }, isAgentBot: true, kind: 'other' },
        { assignee: { id: 7, name: 'Hà' }, isAgentBot: false, kind: 'other' },
        { assignee: {}, isAgentBot: false, kind: 'none' },
    ])('phân loại $kind', ({ assignee, isAgentBot, kind }) => {
        expect(assigneeKind(assignee, isAgentBot, 2)).toBe(kind);
    });

    // Payload realtime dựng object assignee mới cho từng lần cập nhật danh sách.
    it('avatar không vẽ lại khi object mới mang cùng người, vẽ lại khi đổi người', () => {
        const { rerender } = render(<AssigneeAvatar assignee={{ id: 7, name: 'Hà' }} isAgentBot={false} size={16} />);
        rerender(<AssigneeAvatar assignee={{ id: 7, name: 'Hà' }} isAgentBot={false} size={16} />);
        expect(avatarRender).toHaveBeenCalledTimes(1);

        rerender(<AssigneeAvatar assignee={{ id: 8, name: 'Minh' }} isAgentBot={false} size={16} />);
        expect(avatarRender).toHaveBeenCalledTimes(2);
    });
});
