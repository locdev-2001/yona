import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ConversationListFilters } from '../listFilters';

const setListFilters = vi.fn();
let listFilters: ConversationListFilters;

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({
        props: {
            inboxes: [
                { id: 3, name: 'Zalo Shop', channel_type: 'Channel::Api' },
                { id: 7, name: 'Gmail', channel_type: 'Channel::Email' },
            ],
        },
    }),
}));
vi.mock('../ConversationContext', () => ({
    useConversation: () => ({ accountId: 1, listFilters, setListFilters }),
}));
vi.mock('dashboard/composables/useLabelsList', () => ({
    useLabelsList: () => [
        { id: 1, title: 'vip', color: '#ff0000', description: null, show_on_sidebar: true },
        { id: 2, title: 'yona', color: '#00ff00', description: null, show_on_sidebar: false },
    ],
}));
vi.mock('dashboard/notifications/useUnreadCount', () => ({ useNotificationsUnreadInboxCounts: () => ({ 7: 5 }) }));

import ListFilterPanel from './ListFilterPanel';
import { t } from '../../../i18n';

const openAdvanced = vi.fn();
const renderPanel = () => render(<ListFilterPanel onOpenAdvancedFilters={openAdvanced} />);

describe('bảng Lọc nhanh', () => {
    beforeEach(() => {
        setListFilters.mockReset();
        openAdvanced.mockReset();
        listFilters = { inboxIds: [], labels: [], status: 'open', sortBy: 'last_activity_at_desc' };
    });

    it('bấm chip là lọc ngay: trạng thái, kênh, nhãn, sắp xếp', () => {
        renderPanel();

        fireEvent.click(screen.getByRole('button', { name: t('CHAT_LIST.FILTER_PANEL.STATUS_ITEMS.resolved') }));
        fireEvent.click(screen.getByRole('button', { name: /Zalo Shop/ }));
        fireEvent.click(screen.getByRole('button', { name: /yona/ }));
        fireEvent.click(screen.getByRole('button', { name: t('CHAT_LIST.FILTER_PANEL.SORT_ITEMS.waiting_since_asc') }));

        expect(setListFilters.mock.calls).toEqual([
            [{ status: 'resolved' }],
            [{ inboxIds: [3] }],
            [{ labels: ['yona'] }],
            [{ sortBy: 'waiting_since_asc' }],
        ]);
    });

    it('chip đang chọn được đánh dấu, kênh hiện số chưa đọc', () => {
        listFilters = { inboxIds: [7], labels: ['vip'], status: 'all', sortBy: 'unread' };
        renderPanel();

        expect(screen.getByRole('button', { name: t('CHAT_LIST.FILTER_PANEL.STATUS_ITEMS.all') }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: /Gmail/ }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByLabelText(t('CHAT_LIST.FILTER_PANEL.UNREAD', { count: 5 }))).toBeTruthy();
        expect(screen.getByRole('button', { name: /vip/ }).getAttribute('aria-pressed')).toBe('true');
        expect(screen.getByRole('button', { name: t('CHAT_LIST.FILTER_PANEL.SORT_ITEMS.unread') }).getAttribute('aria-pressed')).toBe('true');
    });

    it('sắp xếp cũ ngoài ba kiểu nhanh hiện thêm chip tên đầy đủ, đang chọn', () => {
        listFilters = { ...listFilters, sortBy: 'created_at_asc' };
        renderPanel();

        expect(screen.getByRole('button', { name: t('CHAT_LIST.SORT_ORDER_ITEMS.created_at_asc.TEXT') }).getAttribute('aria-pressed')).toBe('true');
    });

    it('Xoá lọc trả về mặc định, tắt khi chưa lọc gì; Lọc nâng cao mở trình dựng', () => {
        renderPanel();
        expect((screen.getByRole('button', { name: t('CHAT_LIST.FILTER_PANEL.CLEAR') }) as HTMLButtonElement).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: t('CHAT_LIST.FILTER_PANEL.ADVANCED') }));
        expect(openAdvanced).toHaveBeenCalledTimes(1);
    });

    it('Xoá lọc bỏ kênh, nhãn và trạng thái cùng lúc', () => {
        listFilters = { inboxIds: [3], labels: ['vip'], status: 'resolved', sortBy: 'unread' };
        renderPanel();

        fireEvent.click(screen.getByRole('button', { name: t('CHAT_LIST.FILTER_PANEL.CLEAR') }));

        expect(setListFilters).toHaveBeenCalledWith({ inboxIds: [], labels: [], status: 'open' });
    });
});
