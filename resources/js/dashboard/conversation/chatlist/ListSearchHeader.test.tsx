import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ListSearchHeader from './ListSearchHeader';
import type { Conversation } from '../types';

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({ accountId: 1, listFilters: { inboxIds: [], labels: [], status: 'open', sortBy: 'last_activity_at_desc' }, teamId: 0, conversationId: 0, searchQuery: 'an' }),
}));

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    usePage: () => ({ props: { inboxes: [{ id: 59, name: 'Kênh Website QA', channel_type: 'Channel::WebWidget' }] } }),
}));

const contactConversation = {
    id: 12,
    inbox_id: 59,
    meta: { sender: { id: 5, name: 'Sếu đầu đỏ ẩn danh' } },
} as unknown as Conversation;

describe('phần đầu kết quả ô tìm', () => {
    it('mục Liên hệ: tên tô phần khớp, kênh của hội thoại, liên kết tới hội thoại gần nhất', () => {
        const { container } = render(<ListSearchHeader contacts={[contactConversation]} hasConversationMatches />);

        expect(screen.getByRole('heading', { name: 'Contacts' })).toBeTruthy();
        expect(screen.getByRole('heading', { name: 'Conversations' })).toBeTruthy();
        expect(container.querySelector('mark')?.textContent).toBe('ẩn');
        expect(screen.getByText('Kênh Website QA')).toBeTruthy();
        expect(screen.getByRole('link').getAttribute('href')).toMatch(/\/conversations\/12$/);
    });

    it('mục rỗng thì ẩn cả tiêu đề', () => {
        render(<ListSearchHeader contacts={[]} hasConversationMatches={false} />);

        expect(screen.queryByRole('heading')).toBeNull();
    });
});
