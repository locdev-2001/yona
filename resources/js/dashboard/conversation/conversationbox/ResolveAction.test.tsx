import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale } from '../../../i18n';
import type { ConversationStatus } from '../types';

const { visit, openCommandBar, toggleStatus, markMessagesUnread, conversation } = vi.hoisted(() => ({
    visit: vi.fn(),
    openCommandBar: vi.fn(),
    toggleStatus: vi.fn(() => Promise.resolve()),
    markMessagesUnread: vi.fn(() => Promise.resolve()),
    conversation: { id: 4, status: 'open' as ConversationStatus },
}));

vi.mock('@inertiajs/react', () => ({ router: { visit } }));
vi.mock('dashboard/commands/commandBarStore', () => ({ openCommandBar }));
vi.mock('dashboard/composables/useAlert', () => ({ useAlert: vi.fn() }));
vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        selectedConversation: conversation,
        toggleStatus,
        markMessagesUnread,
        accountId: 2,
        inboxId: null,
        teamId: null,
        label: '',
    }),
}));

import ResolveAction from './ResolveAction';

const menuLabels = (container: HTMLElement) =>
    [...container.querySelectorAll('.overlay-surface button')].map(button => button.querySelector('span.truncate')?.textContent);

const openMenu = (status: ConversationStatus) => {
    conversation.status = status;
    const view = render(<ResolveAction />);
    fireEvent.click(view.getByTestId('conversation-status-button'));
    return view;
};

describe('nút trạng thái hội thoại', () => {
    beforeEach(() => setLocale('vi'));
    afterEach(() => {
        setLocale('en');
        vi.clearAllMocks();
    });

    it.each([
        { status: 'open', current: 'Đang mở', items: ['Giải quyết', 'Báo lại…', 'Chờ xử lý', 'Đánh dấu chưa đọc'] },
        { status: 'resolved', current: 'Đã giải quyết', items: ['Mở lại', 'Báo lại…', 'Chờ xử lý', 'Đánh dấu chưa đọc'] },
        { status: 'pending', current: 'Chờ xử lý', items: ['Mở', 'Giải quyết', 'Báo lại…', 'Đánh dấu chưa đọc'] },
        { status: 'snoozed', current: 'Báo lại', items: ['Mở', 'Giải quyết', 'Chờ xử lý', 'Đánh dấu chưa đọc'] },
    ] as const)('$status: nút nói trạng thái hiện tại, menu bỏ mục trùng', ({ status, current, items }) => {
        const { container, getByTestId } = openMenu(status);

        expect(getByTestId('conversation-status-button').textContent).toBe(current);
        expect(menuLabels(container)).toEqual(items);
    });

    it('menu rộng theo nội dung thay vì bị bó theo bề ngang nút', () => {
        const { container } = openMenu('open');

        expect(container.querySelector('.overlay-surface')?.className).toContain('w-max');
    });

    it('Giải quyết gọi đổi trạng thái và hiện phím tắt Alt+E', () => {
        const { container, getByText } = openMenu('open');
        const resolveItem = getByText('Giải quyết').closest('button')!;

        expect(resolveItem.querySelector('kbd')?.textContent).toBe('⌥ E');
        fireEvent.click(resolveItem);

        expect(toggleStatus).toHaveBeenCalledWith({ status: 'resolved', snoozedUntil: null });
        expect(container.querySelector('.overlay-surface')).toBeNull();
    });

    it('Báo lại… mở bảng chọn giờ của command bar và đóng menu', () => {
        const { container, getByText } = openMenu('open');
        fireEvent.click(getByText('Báo lại…'));

        expect(openCommandBar).toHaveBeenCalledWith({ parent: 'snooze_conversation' });
        expect(container.querySelector('.overlay-surface')).toBeNull();
    });

    it('Đánh dấu chưa đọc rồi quay về danh sách', async () => {
        const { getByText } = openMenu('open');
        await act(async () => {
            fireEvent.click(getByText('Đánh dấu chưa đọc'));
        });

        expect(markMessagesUnread).toHaveBeenCalledWith(4);
        expect(visit).toHaveBeenCalledTimes(1);
    });

    it('chế độ gọn chỉ còn chấm màu, nhãn nằm ở title', () => {
        conversation.status = 'open';
        const { getByTestId } = render(<ResolveAction isCompact />);
        const button = getByTestId('conversation-status-button');

        expect(button.textContent).toBe('');
        expect(button.title).toContain('Đang mở');
    });
});
