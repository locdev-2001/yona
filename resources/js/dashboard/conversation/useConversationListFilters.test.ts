import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({
    url: '/app/accounts/2/conversations?inbox=5&label=a',
    props: { currentAccount: { id: 2 }, auth: { user: { ui_settings: { conversations_filter_by: { status: 'resolved', order_by: 'priority_desc', assignee_type: 'me' } } } } },
}));
const get = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({ usePage: () => page, router: { get } }));

import { useConversationListFilters } from './useConversationListFilters';

describe('useConversationListFilters', () => {
    beforeEach(() => {
        get.mockClear();
        window.history.replaceState(null, '', '/app/accounts/2/conversations?q=an&inbox=5&label=a');
    });

    it('ghép kênh/nhãn từ URL với trạng thái/sắp xếp đã lưu', () => {
        const { result } = renderHook(() => useConversationListFilters(vi.fn()));

        expect(result.current.filters).toEqual({ inboxIds: [5], labels: ['a'], status: 'resolved', sortBy: 'priority_desc' });
        expect(result.current.assigneeTab).toBe('me');
    });

    it('đổi nhãn = thay query bằng một lượt điều hướng, giữ ?q=', () => {
        const updateUISettings = vi.fn();
        const { result } = renderHook(() => useConversationListFilters(updateUISettings));

        act(() => result.current.setFilters({ labels: ['a', 'b'] }));

        expect(get).toHaveBeenCalledWith(
            '/app/accounts/2/conversations?q=an&inbox=5&label=a&label=b',
            {},
            { preserveState: true, preserveScroll: true, replace: true },
        );
        expect(updateUISettings).not.toHaveBeenCalled();
    });

    it('đứng ở danh sách mặc định mà thêm kênh thì sang đường dẫn danh sách có lọc', () => {
        window.history.replaceState(null, '', '/app/accounts/2/dashboard?q=an');
        const { result } = renderHook(() => useConversationListFilters(vi.fn()));

        act(() => result.current.setFilters({ inboxIds: [5], labels: [] }));

        expect(get).toHaveBeenCalledWith('/app/accounts/2/conversations?q=an&inbox=5', {}, expect.any(Object));
    });

    it('đổi trạng thái = lưu đủ cụm ui_settings, không điều hướng', () => {
        const updateUISettings = vi.fn();
        const { result } = renderHook(() => useConversationListFilters(updateUISettings));

        act(() => result.current.setFilters({ status: 'all' }));

        expect(result.current.filters.status).toBe('all');
        expect(updateUISettings).toHaveBeenCalledWith({
            conversations_filter_by: { status: 'all', order_by: 'priority_desc', assignee_type: 'me' },
        });
        expect(get).not.toHaveBeenCalled();
    });
});
