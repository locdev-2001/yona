import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationListFilters } from '../listFilters';

const setListFilters = vi.fn();
let listFilters: ConversationListFilters;
const ACCOUNT_INBOXES = [
    { id: 3, name: 'Zalo Shop', channel_type: 'Channel::Api' },
    { id: 7, name: 'Gmail', channel_type: 'Channel::Email' },
];
const page = vi.hoisted(() => ({ props: { inboxes: [] as { id: number; name: string; channel_type: string }[] } }));

vi.mock('@inertiajs/react', () => ({ usePage: () => page }));
vi.mock('../ConversationContext', () => ({ useConversation: () => ({ listFilters, setListFilters }) }));
vi.mock('dashboard/notifications/useUnreadCount', () => ({ useNotificationsUnreadInboxCounts: () => ({ 7: 5 }) }));

import ChannelChipRow from './ChannelChipRow';

const pressedChips = () => screen.getAllByRole('button').filter(chip => chip.getAttribute('aria-pressed') === 'true');

describe('hàng chip kênh trên điện thoại', () => {
    beforeEach(() => {
        setListFilters.mockReset();
        listFilters = { inboxIds: [], labels: [], status: 'open', sortBy: 'last_activity_at_desc' };
        page.props.inboxes = ACCOUNT_INBOXES;
    });

    it('chưa lọc kênh thì Mọi kênh đang chọn; chạm một kênh là lọc ngay', () => {
        render(<ChannelChipRow />);

        expect(pressedChips().map(chip => chip.textContent)).toEqual(['All channels']);
        fireEvent.click(screen.getByRole('button', { name: /Gmail/ }));

        expect(setListFilters).toHaveBeenCalledWith({ inboxIds: [7] });
    });

    it('đang ở một kênh: chạm Mọi kênh bỏ lọc, chạm lại kênh đó cũng bỏ lọc', () => {
        listFilters = { ...listFilters, inboxIds: [7] };
        render(<ChannelChipRow />);

        expect(pressedChips().map(chip => chip.title)).toEqual(['Gmail']);
        fireEvent.click(screen.getByRole('button', { name: 'All channels' }));
        fireEvent.click(screen.getByRole('button', { name: /Gmail/ }));

        expect(setListFilters.mock.calls).toEqual([[{ inboxIds: [] }], [{ inboxIds: [] }]]);
    });

    it('chip kênh mang số chưa đọc như bảng Lọc', () => {
        render(<ChannelChipRow />);

        expect(screen.getByLabelText('5 unread conversations')).not.toBeNull();
    });

    it('tài khoản chỉ một hộp thư thì không có hàng chip', () => {
        page.props.inboxes = ACCOUNT_INBOXES.slice(0, 1);
        const { container } = render(<ChannelChipRow />);

        expect(container.firstChild).toBeNull();
    });
});
