import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ConversationList from './ConversationList';
import type { Conversation } from '../types';

const reorderPinnedConversations = vi.fn(() => Promise.resolve());
let isSelecting = false;

vi.mock('../ConversationContext', () => ({
    useConversation: () => ({
        accountId: 1,
        inboxId: 0,
        teamId: 0,
        label: '',
        conversationId: 0,
        searchQuery: '',
        focusMessage: vi.fn(),
        markMessagesRead: vi.fn(),
        markMessagesUnread: vi.fn(),
        setConversationPinned: vi.fn(),
        reorderPinnedConversations,
    }),
}));

vi.mock('@inertiajs/react', () => ({
    router: { visit: vi.fn() },
    usePage: () => ({ props: { inboxes: [{ id: 59, name: 'Zalo shop', channel_type: 'Channel::Zalo' }] } }),
}));

vi.mock('dashboard/composables/useBulkActions', () => ({
    useBulkSelection: () => ({
        isSelecting,
        isConversationSelected: () => false,
        selectConversation: vi.fn(),
        deSelectConversation: vi.fn(),
    }),
}));
vi.mock('dashboard/realtime/hooks', () => ({ useContactAvailabilityStatus: () => 'offline' }));

const ROW_HEIGHT = 60;

function conversation(id: number, pinPosition: number | null): Conversation {
    return {
        id,
        inbox_id: 59,
        unread_count: 0,
        status: 'open',
        priority: null,
        labels: [],
        messages: [],
        timestamp: 1756707112,
        created_at: 1756707112,
        meta: { sender: { id: id, name: `Khách ${id}` }, channel: 'Channel::Zalo' },
        last_non_activity_message: null,
        pinned: pinPosition !== null,
        pin_position: pinPosition,
    } as unknown as Conversation;
}

const LIST = [conversation(11, 0), conversation(12, 1), conversation(13, 2), conversation(14, null)];

function renderList(sortablePins = true) {
    return render(<ConversationList conversationList={LIST} sortablePins={sortablePins} showEndOfListMessage onLoadMore={vi.fn()} />);
}

function menuLabelsOf(index: number): (string | null)[] {
    fireEvent.click(screen.getAllByRole('button', { name: 'Conversation actions' })[index]);

    return [...document.querySelectorAll('.menu-label')].map(item => item.textContent);
}

// jsdom không dàn trang: mỗi dòng ghim đứng thành một hàng cao ROW_HEIGHT theo thứ tự DOM.
function layoutRows() {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        const rows = [...document.querySelectorAll('[data-pinned-row]')];
        const index = rows.indexOf(this);
        const top = Math.max(index, 0) * ROW_HEIGHT;

        return { x: 0, y: top, top, left: 0, right: 300, bottom: top + ROW_HEIGHT, width: 300, height: ROW_HEIGHT, toJSON: () => ({}) } as DOMRect;
    });
}

function dragRow(conversationId: number, deltaY: number) {
    const row = document.querySelector(`[data-pinned-row="${conversationId}"]`)!;
    const handle = row.querySelector('[data-pin-drag-handle]')!;
    const startY = ([...document.querySelectorAll('[data-pinned-row]')].indexOf(row) + 0.5) * ROW_HEIGHT;

    act(() => {
        fireEvent.mouseDown(handle, { button: 0, clientX: 4, clientY: startY });
    });
    act(() => {
        fireEvent.mouseMove(document, { clientX: 10, clientY: startY + 10 });
    });
    act(() => {
        fireEvent.mouseMove(document, { clientX: 10, clientY: startY + deltaY });
    });
    act(() => {
        fireEvent.mouseUp(document, { clientX: 10, clientY: startY + deltaY });
    });
}

describe('đổi thứ tự nhóm ghim', () => {
    beforeEach(() => {
        reorderPinnedConversations.mockClear();
        isSelecting = false;
    });
    // Thả chuột xong dnd-kit còn nuốt cú click kế tiếp tới hết một nhịp hẹn giờ.
    afterEach(async () => {
        vi.restoreAllMocks();
        await act(() => new Promise(resolve => setTimeout(resolve)));
    });

    it('menu chỉ hiện mục đổi chỗ còn làm được, thẻ chưa ghim không có', () => {
        renderList();

        expect(menuLabelsOf(0)).toEqual(['Unpin conversation', 'Move down', 'Mark as unread']);
        fireEvent.blur(document.querySelector('[data-popover-content]')!);
        expect(menuLabelsOf(1)).toEqual(['Unpin conversation', 'Move to top of pinned', 'Move up', 'Move down', 'Mark as unread']);
        fireEvent.blur(document.querySelector('[data-popover-content]')!);
        expect(menuLabelsOf(2)).toEqual(['Unpin conversation', 'Move to top of pinned', 'Move up', 'Mark as unread']);
        fireEvent.blur(document.querySelector('[data-popover-content]')!);
        expect(menuLabelsOf(3)).toEqual(['Pin conversation', 'Mark as unread']);
    });

    it.each([
        { index: 1, label: 'Move up', expected: [12, 11, 13] },
        { index: 1, label: 'Move down', expected: [11, 13, 12] },
        { index: 2, label: 'Move to top of pinned', expected: [13, 11, 12] },
    ])('mục $label gửi trọn thứ tự nhóm ghim mới', ({ index, label, expected }) => {
        renderList();

        menuLabelsOf(index);
        fireEvent.click(within(document.querySelector('[data-popover-content]') as HTMLElement).getByText(label));

        expect(reorderPinnedConversations).toHaveBeenCalledWith(expected);
        expect(document.querySelector('[data-popover-content]')).toBeNull();
    });

    it('chỉ thẻ đã ghim có tay nắm kéo', () => {
        renderList();

        const handles = [...document.querySelectorAll('[data-pin-drag-handle]')];

        expect(handles.map(handle => handle.closest('[data-pinned-row]')?.getAttribute('data-pinned-row'))).toEqual(['11', '12', '13']);
    });

    it('kéo tay nắm thẻ ghim xuống dưới gửi thứ tự mới', () => {
        renderList();
        layoutRows();

        dragRow(11, ROW_HEIGHT * 2);

        expect(reorderPinnedConversations).toHaveBeenCalledWith([12, 13, 11]);
    });

    it('thả ngoài nhóm ghim thì không đổi thứ tự', () => {
        renderList();
        layoutRows();

        dragRow(11, ROW_HEIGHT * 5);

        expect(reorderPinnedConversations).not.toHaveBeenCalled();
    });

    it('rê chưa quá ngưỡng thì không thành kéo', () => {
        renderList();
        layoutRows();

        dragRow(11, 3);

        expect(reorderPinnedConversations).not.toHaveBeenCalled();
    });

    it('đang chọn nhiều thì không kéo', () => {
        isSelecting = true;
        renderList();
        layoutRows();

        dragRow(11, ROW_HEIGHT * 2);

        expect(reorderPinnedConversations).not.toHaveBeenCalled();
    });

    it('danh sách kết quả tìm không có tay nắm, không có mục đổi chỗ', () => {
        renderList(false);
        expect(document.querySelector('[data-pinned-row]')).toBeNull();
        expect(menuLabelsOf(0)).toEqual(['Unpin conversation', 'Mark as unread']);
        expect(reorderPinnedConversations).not.toHaveBeenCalled();
    });
});
