import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emitter } from 'shared/helpers/emitter';

const pageProps = vi.hoisted(() => ({ conversationId: null as number | null }));
vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: pageProps }) }));

const getJson = vi.hoisted(() => vi.fn());
vi.mock('dashboard/helper/apiClient', () => ({ getJson }));

import { bindUnreadCount, resetUnreadCount } from 'dashboard/notifications/useUnreadCount';
import MobileSidebarLauncher from './MobileSidebarLauncher';

const UNREAD_DOT = '[data-test-id="mobile-launcher-unread-dot"]';

async function renderLauncher(unreadCount: number) {
    getJson.mockResolvedValue({ unread_count: unreadCount, unread_inbox_counts: {} });
    const view = render(<MobileSidebarLauncher isMobileSidebarOpen={false} onToggle={() => undefined} />);
    await act(async () => {
        bindUnreadCount(2);
        await Promise.resolve();
    });
    return view;
}

describe('nút menu nổi trên điện thoại', () => {
    beforeEach(() => {
        resetUnreadCount();
        pageProps.conversationId = null;
    });

    afterEach(() => resetUnreadCount());

    it('có thông báo chưa đọc thì hiện chấm đỏ và nói cho trình đọc màn hình', async () => {
        const { container } = await renderLauncher(3);

        expect(container.querySelector(UNREAD_DOT)).not.toBeNull();
        expect(container.querySelector('#mobile-sidebar-launcher')?.getAttribute('aria-label')).toBe(
            'You have unread notifications',
        );
    });

    it('không còn gì chưa đọc thì không có chấm', async () => {
        const { container } = await renderLauncher(0);

        expect(container.querySelector(UNREAD_DOT)).toBeNull();
    });

    it('chấm tắt ngay khi realtime báo đã đọc hết', async () => {
        const { container } = await renderLauncher(2);

        act(() => emitter.emit('notification.updated', { notification: { id: 1 }, unread_count: 0, count: 2, account_id: 2 }));

        expect(container.querySelector(UNREAD_DOT)).toBeNull();
    });

    it('đang mở một hội thoại thì cả nút không hiện', async () => {
        pageProps.conversationId = 42;

        const { container } = await renderLauncher(3);

        expect(container.querySelector('#mobile-sidebar-launcher')).toBeNull();
    });
});
