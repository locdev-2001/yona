import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useEffect } from 'react';
import { App, router } from '@inertiajs/react';

import { emitter } from 'shared/helpers/emitter';

const api = vi.hoisted(() => ({
    fetchUnreadCounts: vi.fn(),
    fetchNotifications: vi.fn(),
}));
vi.mock('dashboard/notifications/api', () => api);

import { documentTitle } from './documentTitle';
import UnreadTitleSync from 'dashboard/notifications/components/UnreadTitleSync';
import { bindUnreadIndicators, clearUnreadIndicators } from 'dashboard/notifications/unreadIndicators';

// Head manager thật của Inertia ghi <title> qua một hàm debounce, nên sau mỗi thao
// tác phải chờ nó chạy xong rồi mới đọc document.title.
const HEAD_WRITE_WAIT_MS = 20;
const ACCOUNT_ID = 2;

// Khung app thu gọn: giống Dashboard ở đúng hai điểm chạm tiêu đề tab.
function DashboardShell() {
    useEffect(() => {
        bindUnreadIndicators(ACCOUNT_ID);
    }, []);

    return <UnreadTitleSync />;
}

const waitForHeadWrite = () => act(() => new Promise<void>(resolve => setTimeout(resolve, HEAD_WRITE_WAIT_MS)));

async function visit(url: string) {
    await act(async () => {
        router.push({ component: 'DashboardShell', url, props: {} });
    });
    await waitForHeadWrite();
}

async function emitUnreadCount(unreadCount: number) {
    await act(async () => {
        emitter.emit('notification.updated', { account_id: ACCOUNT_ID, unread_count: unreadCount, count: 5, notification: { id: 1 } });
    });
    await waitForHeadWrite();
}

// Số chưa đọc về muộn hơn lần ghi <title> đầu tiên, như trên trình duyệt thật.
async function mountAppWithUnreadCount(unreadCount: number) {
    let resolveUnreadCounts: (payload: { unread_count: number; unread_inbox_counts: Record<string, number> }) => void = () => undefined;
    api.fetchUnreadCounts.mockImplementation(() => new Promise(resolve => (resolveUnreadCounts = resolve)));

    render(
        <App
            initialPage={{ component: 'DashboardShell', props: {}, url: '/app/accounts/2/dashboard', version: null } as never}
            initialComponent={DashboardShell}
            resolveComponent={() => DashboardShell}
            titleCallback={documentTitle}
            onHeadUpdate={() => undefined}
        />,
    );
    await waitForHeadWrite();

    await act(async () => resolveUnreadCounts({ unread_count: unreadCount, unread_inbox_counts: {} }));
    await waitForHeadWrite();
}

describe('tiêu đề tab theo số thông báo chưa đọc', () => {
    beforeEach(() => {
        document.head.innerHTML = '<title inertia>Yona</title>';
        api.fetchNotifications.mockResolvedValue({ payload: [], meta: { count: 0, currentPage: 1 } });
    });

    afterEach(async () => {
        await clearUnreadIndicators();
        vi.clearAllMocks();
    });

    it('đổi trang Inertia vẫn giữ tiền tố số chưa đọc', async () => {
        await mountAppWithUnreadCount(1);
        expect(document.title).toBe('(1) Yona');

        await visit('/app/accounts/2/mentions/conversations');
        expect(document.title).toBe('(1) Yona');

        await visit('/app/accounts/2/contacts');
        expect(document.title).toBe('(1) Yona');
    });

    it('số đổi qua realtime thì tiêu đề đổi theo; về 0 thì mất tiền tố, kể cả sau khi đổi trang', async () => {
        await mountAppWithUnreadCount(2);
        expect(document.title).toBe('(2) Yona');

        await emitUnreadCount(3);
        expect(document.title).toBe('(3) Yona');

        await emitUnreadCount(0);
        expect(document.title).toBe('Yona');

        await visit('/app/accounts/2/dashboard');
        expect(document.title).toBe('Yona');
    });

    it('đăng xuất thì tiêu đề không còn số', async () => {
        await mountAppWithUnreadCount(4);
        expect(document.title).toBe('(4) Yona');

        await act(async () => {
            await clearUnreadIndicators();
        });
        await waitForHeadWrite();

        expect(document.title).toBe('Yona');
    });

    it('trang có tiêu đề riêng vẫn ghép tiền tố vào trước', async () => {
        await mountAppWithUnreadCount(120);

        expect(documentTitle('Cài đặt')).toBe('(99+) Cài đặt — Yona');
        expect(documentTitle('')).toBe('(99+) Yona');
    });
});
