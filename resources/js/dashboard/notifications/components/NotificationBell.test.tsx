import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { MouseEvent, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { NotificationRecord } from '../types';

// jsdom chưa có ResizeObserver — Popover đo khung nổi bằng nó.
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

const visit = vi.hoisted(() => vi.fn());
const pageProps = vi.hoisted(() => ({
    currentAccount: { id: 2 },
    auth: { user: { id: 1, ui_settings: { inbox_filter_by: { status: 'snoozed', type: '', sort_by: 'asc' } } } },
    inboxes: [{ id: 1, name: 'Website', channel_type: 'Channel::WebWidget' }],
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: pageProps }),
    router: { visit, on: () => () => undefined },
    Link: ({ href, className, onClick, children }: { href: string; className?: string; onClick?: () => void; children: ReactNode }) => (
        <a
            href={href}
            className={className}
            onClick={(event: MouseEvent) => {
                event.preventDefault();
                onClick?.();
            }}
        >
            {children}
        </a>
    ),
}));

const api = vi.hoisted(() => ({
    getJson: vi.fn(),
    postJson: vi.fn(),
    putJson: vi.fn(),
    patchJson: vi.fn(),
    deleteJson: vi.fn(),
}));
vi.mock('dashboard/helper/apiClient', () => api);

import { bindUnreadCount, resetUnreadCount } from '../useUnreadCount';
import NotificationBell from './NotificationBell';

const NOTIFICATIONS_URL = '/api/v1/accounts/2/notifications';
const BELL_LIST_URL = `${NOTIFICATIONS_URL}?page=1&sort_order=desc&includes%5B%5D=read`;

function notification(id: number, overrides: Partial<NotificationRecord> = {}): NotificationRecord {
    return {
        id,
        notification_type: 'conversation_assignment',
        push_message_title: '',
        push_message_body: `Khách ${id}: Shop còn hàng không?`,
        primary_actor_type: 'Conversation',
        primary_actor_id: id * 100,
        primary_actor: { id: id * 10, inbox_id: 1, priority: null, meta: { sender: { id, name: `Khách ${id}` } } },
        read_at: null,
        secondary_actor: null,
        user: null,
        created_at: 1757000000 + id,
        last_activity_at: 1757000000 + id,
        snoozed_until: null,
        meta: null,
        ...overrides,
    } as NotificationRecord;
}

function serveApi({ unreadCount, notifications }: { unreadCount: number; notifications: NotificationRecord[] }) {
    api.getJson.mockImplementation(async (url: string) => {
        if (url.endsWith('/unread_count')) return unreadCount;
        return { data: { meta: { count: notifications.length, current_page: 1, unread_count: unreadCount }, payload: notifications } };
    });
}

async function renderBell({ unreadCount = 2, notifications = [notification(1), notification(2)] } = {}) {
    serveApi({ unreadCount, notifications });
    const onNavigate = vi.fn();
    const view = render(<NotificationBell isCollapsed={false} onNavigate={onNavigate} />);
    await act(async () => {
        bindUnreadCount(2);
    });
    await waitFor(() => expect(api.getJson).toHaveBeenCalledWith(`${NOTIFICATIONS_URL}/unread_count`));
    return { ...view, onNavigate };
}

function bellButton(container: HTMLElement): HTMLElement {
    return container.querySelector('[data-test-id="notification-bell"]') as HTMLElement;
}

function bellCount(container: HTMLElement): string | null {
    return container.querySelector('[data-test-id="notification-bell-count"]')?.textContent ?? null;
}

async function openPanel(container: HTMLElement) {
    fireEvent.click(bellButton(container));
    await screen.findByText('Notifications');
}

function panel(): HTMLElement | null {
    return document.querySelector('[data-test-id="notification-bell-panel"]');
}

describe('chuông thông báo', () => {
    beforeEach(() => {
        resetUnreadCount();
        Object.values(api).forEach(mock => mock.mockReset());
        api.postJson.mockResolvedValue({});
        visit.mockReset();
    });

    afterEach(() => resetUnreadCount());

    it('không có thông báo chưa đọc thì không hiện số', async () => {
        const { container } = await renderBell({ unreadCount: 0 });

        await waitFor(() => expect(bellButton(container).getAttribute('aria-label')).toBe('Notifications, 0 unread'));
        expect(bellCount(container)).toBeNull();
    });

    it('hiện số chưa đọc, quá 99 thì 99+', async () => {
        const { container, unmount } = await renderBell({ unreadCount: 4 });
        await waitFor(() => expect(bellCount(container)).toBe('4'));
        expect(bellButton(container).getAttribute('aria-label')).toBe('Notifications, 4 unread');
        unmount();
        resetUnreadCount();

        const second = await renderBell({ unreadCount: 150 });
        await waitFor(() => expect(bellCount(second.container)).toBe('99+'));
    });

    it('mở panel thì nạp 15 thông báo mới nhất gồm cả đã đọc, không ghi đè bộ lọc của trang đầy đủ', async () => {
        const { container } = await renderBell();

        await openPanel(container);

        expect(api.getJson).toHaveBeenCalledWith(BELL_LIST_URL);
        await waitFor(() => expect(panel()?.querySelectorAll('[role="button"]')).toHaveLength(2));
        expect(panel()?.textContent).toContain('Khách 2:');
        expect(api.putJson).not.toHaveBeenCalled();
    });

    it('bấm một thông báo: đánh dấu đã đọc, mở hội thoại ở màn Hội thoại, đóng panel', async () => {
        const { container, onNavigate } = await renderBell();
        await openPanel(container);
        await waitFor(() => expect(panel()?.textContent).toContain('Khách 1:'));

        const firstCard = [...(panel()?.querySelectorAll<HTMLElement>('[role="button"]') ?? [])].find(card =>
            card.textContent?.includes('Khách 1:'),
        ) as HTMLElement;
        fireEvent.click(firstCard);

        expect(api.postJson).toHaveBeenCalledWith(`${NOTIFICATIONS_URL}/read_all`, {
            primary_actor_type: 'Conversation',
            primary_actor_id: 100,
        });
        expect(visit).toHaveBeenCalledWith('/app/accounts/2/conversations/10');
        expect(onNavigate).toHaveBeenCalledOnce();
        await waitFor(() => expect(panel()).toBeNull());
    });

    it('"Đánh dấu tất cả đã đọc" gọi read_all không kèm hội thoại', async () => {
        const { container } = await renderBell();
        await openPanel(container);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Mark all as read' })).not.toBeDisabled());

        fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));

        expect(api.postJson).toHaveBeenCalledWith(`${NOTIFICATIONS_URL}/read_all`, {
            primary_actor_type: undefined,
            primary_actor_id: undefined,
        });
    });

    it('nút đánh dấu tất cả bị tắt khi số chưa đọc là 0', async () => {
        const { container } = await renderBell({ unreadCount: 0, notifications: [notification(1, { read_at: '2026-09-24T00:00:00Z' })] });
        await openPanel(container);

        expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled();
    });

    it('link "Xem tất cả" dẫn tới trang thông báo đầy đủ và đóng panel', async () => {
        const { container, onNavigate } = await renderBell();
        await openPanel(container);

        const viewAll = screen.getByText('View all notifications');
        expect(viewAll.getAttribute('href')).toBe('/app/accounts/2/inbox-view');

        fireEvent.click(viewAll);
        expect(onNavigate).toHaveBeenCalledOnce();
    });

    it('chưa có thông báo nào thì nói rõ', async () => {
        const { container } = await renderBell({ unreadCount: 0, notifications: [] });
        await openPanel(container);

        expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
    });

    it('menu chuột phải trên thẻ: bấm "Đánh dấu là chưa đọc" không làm đóng panel', async () => {
        const { container } = await renderBell({
            unreadCount: 0,
            notifications: [notification(1, { read_at: '2026-09-24T00:00:00Z' })],
        });
        await openPanel(container);
        await waitFor(() => expect(panel()?.textContent).toContain('Khách 1:'));
        api.postJson.mockResolvedValue(notification(1));

        const card = panel()?.querySelector<HTMLElement>('[role="button"]') as HTMLElement;
        fireEvent.contextMenu(card, { clientX: 40, clientY: 40 });
        const markAsUnread = await screen.findByText('Mark as unread');
        fireEvent.mouseDown(markAsUnread);
        fireEvent.click(markAsUnread);

        expect(api.postJson).toHaveBeenCalledWith(`${NOTIFICATIONS_URL}/1/unread`, {});
        expect(panel()).not.toBeNull();
    });
});
