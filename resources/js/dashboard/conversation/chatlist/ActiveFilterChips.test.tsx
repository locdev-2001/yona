import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationListFilters } from '../listFilters';

const setListFilters = vi.fn();
let listFilters: ConversationListFilters;

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { inboxes: [{ id: 3, name: 'Zalo Shop', channel_type: 'Channel::Api' }] } }),
}));
vi.mock('../ConversationContext', () => ({
    useConversation: () => ({ accountId: 1, listFilters, setListFilters }),
}));
vi.mock('dashboard/composables/useLabelsList', () => ({
    useLabelsList: () => [{ id: 1, title: 'yona', color: '#00ff00', description: null, show_on_sidebar: true }],
}));

import ActiveFilterChips from './ActiveFilterChips';
import { t } from '../../../i18n';

describe('hàng chip lọc đang bật', () => {
    beforeEach(() => {
        setListFilters.mockReset();
    });

    it('không lọc gì thì không chiếm chỗ', () => {
        listFilters = { inboxIds: [], labels: [], status: 'open', sortBy: 'unread' };
        const { container } = render(<ActiveFilterChips />);

        expect(container.innerHTML).toBe('');
    });

    it('kênh + nhãn + Đã giải quyết ra ba chip, × từng chip bỏ đúng bộ lọc đó', () => {
        listFilters = { inboxIds: [3], labels: ['yona'], status: 'resolved', sortBy: 'last_activity_at_desc' };
        render(<ActiveFilterChips />);

        const chips = screen.getAllByRole('button');
        expect(chips.map(chip => chip.getAttribute('aria-label'))).toEqual([
            t('CHAT_LIST.FILTER_PANEL.REMOVE', { name: 'Zalo Shop' }),
            t('CHAT_LIST.FILTER_PANEL.REMOVE', { name: 'yona' }),
            t('CHAT_LIST.FILTER_PANEL.REMOVE', { name: t('CHAT_LIST.FILTER_PANEL.STATUS_ITEMS.resolved') }),
        ]);

        chips.forEach(chip => fireEvent.click(chip));
        expect(setListFilters.mock.calls).toEqual([[{ inboxIds: [] }], [{ labels: [] }], [{ status: 'open' }]]);
    });
});
