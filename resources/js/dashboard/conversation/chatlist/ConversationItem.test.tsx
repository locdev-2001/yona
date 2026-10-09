import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ConversationItem from './ConversationItem';
import type { Conversation } from '../types';

const setConversationPinned = vi.fn(() => Promise.resolve());

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        accountId: 1,
        inboxId: 0,
        teamId: 0,
        label: '',
        conversationId: 0,
        searchQuery: '',
        markMessagesRead: vi.fn(),
        markMessagesUnread: vi.fn(),
        setConversationPinned,
    }),
}));

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    usePage: () => ({
        props: { inboxes: [{ id: 59, name: 'Nguyễn Phước Lộc', channel_type: 'Channel::Zalo' }] },
    }),
}));

vi.mock('dashboard/composables/useBulkActions', () => ({ useBulkSelection: () => null }));
vi.mock('dashboard/realtime/hooks', () => ({ useContactAvailabilityStatus: () => 'offline' }));

const CONVERSATION = {
    id: 138,
    inbox_id: 59,
    unread_count: 0,
    status: 'open',
    priority: null,
    labels: [],
    messages: [],
    timestamp: 1756707112,
    created_at: 1756707112,
    meta: { sender: { id: 5, name: 'Pham Nguyen' }, channel: 'Channel::Zalo' },
    last_non_activity_message: null,
} as unknown as Conversation;

const MORE_ACTIONS = { name: 'Conversation actions' };

describe('menu thao tác của thẻ hội thoại', () => {
    beforeEach(() => setConversationPinned.mockClear());

    it('nút "…" và chuột phải mở cùng một menu', () => {
        const { container } = render(<ConversationItem source={CONVERSATION} />);

        fireEvent.click(screen.getByRole('button', MORE_ACTIONS));
        const fromButton = [...document.querySelectorAll('.menu-label')].map(item => item.textContent);
        fireEvent.blur(document.querySelector('[data-popover-content]')!);
        expect(document.querySelector('[data-popover-content]')).toBeNull();

        fireEvent.contextMenu(container.querySelector('.conversation')!);
        const fromRightClick = [...document.querySelectorAll('.menu-label')].map(item => item.textContent);

        expect(fromButton).toEqual(['Pin conversation', 'Mark as unread']);
        expect(fromRightClick).toEqual(fromButton);
    });

    it.each([
        { pinned: false, label: 'Pin conversation', next: true },
        { pinned: true, label: 'Unpin conversation', next: false },
    ])('mục ghim đảo trạng thái ghim: %o', ({ pinned, label, next }) => {
        render(<ConversationItem source={{ ...CONVERSATION, pinned }} />);

        fireEvent.click(screen.getByRole('button', MORE_ACTIONS));
        fireEvent.click(screen.getByText(label));

        expect(setConversationPinned).toHaveBeenCalledWith(138, next);
        expect(document.querySelector('[data-popover-content]')).toBeNull();
    });
});
