import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('@inertiajs/react', () => ({ router: { post: (...args: unknown[]) => post(...args) } }));

const detachPushOnLogout = vi.fn<() => Promise<void>>();
vi.mock('./pushHelper', () => ({ detachPushOnLogout: () => detachPushOnLogout() }));

const clearUnreadIndicators = vi.fn<() => Promise<void>>();
vi.mock('dashboard/notifications/unreadIndicators', () => ({
    clearUnreadIndicators: () => clearUnreadIndicators(),
}));

import { logout } from './logout';

describe('đăng xuất gỡ đăng ký thông báo đẩy của trình duyệt trước', () => {
    beforeEach(() => {
        post.mockReset();
        detachPushOnLogout.mockReset();
        detachPushOnLogout.mockResolvedValue(undefined);
        clearUnreadIndicators.mockReset();
        clearUnreadIndicators.mockResolvedValue(undefined);
    });

    afterEach(() => vi.useRealTimers());

    it('gỡ đăng ký rồi mới đăng xuất', async () => {
        const order: string[] = [];
        detachPushOnLogout.mockImplementation(async () => {
            order.push('detach');
        });
        post.mockImplementation(() => order.push('logout'));

        await logout();

        expect(order).toEqual(['detach', 'logout']);
        expect(post).toHaveBeenCalledWith('/app/logout');
    });

    it('dọn badge, tiêu đề tab và khay thông báo rồi mới đăng xuất', async () => {
        const order: string[] = [];
        clearUnreadIndicators.mockImplementation(async () => {
            order.push('clear');
        });
        post.mockImplementation(() => order.push('logout'));

        await logout();

        expect(order).toEqual(['clear', 'logout']);
    });

    it('dọn khay lỗi vẫn đăng xuất', async () => {
        clearUnreadIndicators.mockRejectedValue(new Error('no service worker'));

        await logout();

        expect(post).toHaveBeenCalledWith('/app/logout');
    });

    it('gỡ đăng ký lỗi vẫn đăng xuất', async () => {
        detachPushOnLogout.mockRejectedValue(new Error('offline'));

        await logout();

        expect(post).toHaveBeenCalledWith('/app/logout');
    });

    it('mạng treo cũng không giữ người dùng lại quá 2 giây', async () => {
        vi.useFakeTimers();
        detachPushOnLogout.mockReturnValue(new Promise(() => undefined));

        const pending = logout();
        await vi.advanceTimersByTimeAsync(2000);
        await pending;

        expect(post).toHaveBeenCalledWith('/app/logout');
    });
});
