import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ChatListSearch from './ChatListSearch';

const setSearchQuery = vi.fn();
let searchQuery = '';

const visit = vi.hoisted(() => vi.fn());
vi.mock('@inertiajs/react', () => ({ router: { visit } }));
vi.mock('../ConversationContext', () => ({
    useConversation: () => ({ accountId: 2, searchQuery, setSearchQuery, isComposing: false }),
}));

describe('ô tìm trong cột danh sách hội thoại', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        setSearchQuery.mockReset();
        searchQuery = '';
    });

    afterEach(() => vi.useRealTimers());

    it('gõ xong mới lọc danh sách, không gửi theo từng phím', () => {
        render(<ChatListSearch />);
        const input = screen.getByRole('searchbox');

        fireEvent.change(input, { target: { value: 'ng' } });
        fireEvent.change(input, { target: { value: 'nguyen' } });
        expect(setSearchQuery).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(300));
        expect(setSearchQuery).toHaveBeenCalledTimes(1);
        expect(setSearchQuery).toHaveBeenCalledWith('nguyen');
    });

    it('mở lại trang với từ khoá sẵn trên URL thì ô hiện đúng từ khoá, nút xoá về danh sách cũ ngay', () => {
        searchQuery = 'lan';
        render(<ChatListSearch />);
        const input = screen.getByRole('searchbox') as HTMLInputElement;

        expect(input.value).toBe('lan');
        fireEvent.click(screen.getByRole('button', { name: /Xoá từ khoá|Clear search/ }));

        expect(input.value).toBe('');
        expect(setSearchQuery).toHaveBeenCalledWith('');
    });

    it('Esc xoá từ khoá đang gõ', () => {
        searchQuery = 'lan';
        render(<ChatListSearch />);
        const input = screen.getByRole('searchbox') as HTMLInputElement;

        fireEvent.keyDown(input, { key: 'Escape' });

        expect(input.value).toBe('');
        expect(setSearchQuery).toHaveBeenCalledWith('');
    });

    it('nút soạn cạnh ô tìm mở bản nháp hội thoại ngay trong Inbox', () => {
        render(<ChatListSearch />);
        fireEvent.click(screen.getByRole('button', { name: /Soạn tin nhắn mới|New message/ }));

        expect(visit).toHaveBeenCalledWith('/app/accounts/2/inbox/new', { preserveState: true, preserveScroll: true });
    });
});
