import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyUnreadTitle, closeTrayNotifications, formatUnreadTitle, setAppBadgeCount } from './notificationTray';

const STUBBED_NAVIGATOR_KEYS = ['serviceWorker', 'setAppBadge', 'clearAppBadge'] as const;

function stubNavigator(key: (typeof STUBBED_NAVIGATOR_KEYS)[number], value: unknown) {
    Object.defineProperty(navigator, key, { configurable: true, value });
}

function trayNotification(data: Record<string, unknown>) {
    return { data, close: vi.fn() };
}

afterEach(() => {
    STUBBED_NAVIGATOR_KEYS.forEach(key => {
        delete (navigator as unknown as Record<string, unknown>)[key];
    });
    document.title = '';
});

describe('formatUnreadTitle', () => {
    it('thêm số chưa đọc vào đầu tiêu đề', () => {
        expect(formatUnreadTitle('Yona', 3)).toBe('(3) Yona');
    });

    it('về 0 thì bỏ tiền tố', () => {
        expect(formatUnreadTitle('(3) Yona', 0)).toBe('Yona');
    });

    it('quá 99 thì hiện 99+', () => {
        expect(formatUnreadTitle('(3) Yona', 120)).toBe('(99+) Yona');
        expect(formatUnreadTitle('(99+) Yona', 5)).toBe('(5) Yona');
    });

    it('không nhân đôi tiền tố', () => {
        expect(formatUnreadTitle(formatUnreadTitle('Yona', 2), 2)).toBe('(2) Yona');
    });

    it('giữ nguyên tiêu đề có số ở giữa', () => {
        expect(formatUnreadTitle('Hội thoại (12)', 1)).toBe('(1) Hội thoại (12)');
    });
});

describe('applyUnreadTitle', () => {
    it('đổi document.title theo số chưa đọc', () => {
        document.title = 'Yona';

        applyUnreadTitle(4);
        expect(document.title).toBe('(4) Yona');

        applyUnreadTitle(0);
        expect(document.title).toBe('Yona');
    });
});

describe('setAppBadgeCount', () => {
    it('có số thì đặt badge, về 0 thì xoá', async () => {
        const setAppBadge = vi.fn().mockResolvedValue(undefined);
        const clearAppBadge = vi.fn().mockResolvedValue(undefined);
        stubNavigator('setAppBadge', setAppBadge);
        stubNavigator('clearAppBadge', clearAppBadge);

        await setAppBadgeCount(5);
        await setAppBadgeCount(0);

        expect(setAppBadge).toHaveBeenCalledWith(5);
        expect(clearAppBadge).toHaveBeenCalledOnce();
    });

    it('trình duyệt không có API thì không ném', async () => {
        await expect(setAppBadgeCount(5)).resolves.toBeUndefined();
        await expect(setAppBadgeCount(0)).resolves.toBeUndefined();
    });

    it('API từ chối thì không ném', async () => {
        stubNavigator('setAppBadge', vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')));

        await expect(setAppBadgeCount(2)).resolves.toBeUndefined();
    });
});

describe('closeTrayNotifications', () => {
    it('chỉ đóng thông báo mà điều kiện chọn', async () => {
        const conversationSeven = trayNotification({ account_id: 2, primary_actor_id: 7 });
        const conversationEight = trayNotification({ account_id: 2, primary_actor_id: 8 });
        const register = vi.fn();
        const getRegistration = vi.fn().mockResolvedValue({
            getNotifications: vi.fn().mockResolvedValue([conversationSeven, conversationEight]),
        });
        stubNavigator('serviceWorker', { getRegistration, register });

        await closeTrayNotifications(data => data.primary_actor_id === 7);

        expect(getRegistration).toHaveBeenCalledWith('/sw.js');
        expect(conversationSeven.close).toHaveBeenCalledOnce();
        expect(conversationEight.close).not.toHaveBeenCalled();
        expect(register).not.toHaveBeenCalled();
    });

    it('thông báo không có data vẫn được hỏi với object rỗng', async () => {
        const legacy = { data: null, close: vi.fn() };
        stubNavigator('serviceWorker', {
            getRegistration: vi.fn().mockResolvedValue({ getNotifications: vi.fn().mockResolvedValue([legacy]) }),
        });
        const shouldClose = vi.fn().mockReturnValue(true);

        await closeTrayNotifications(shouldClose);

        expect(shouldClose).toHaveBeenCalledWith({});
        expect(legacy.close).toHaveBeenCalledOnce();
    });

    it('không có service worker hay chưa đăng ký thì không ném, không đăng ký mới', async () => {
        await expect(closeTrayNotifications(() => true)).resolves.toBeUndefined();

        const register = vi.fn();
        stubNavigator('serviceWorker', { getRegistration: vi.fn().mockResolvedValue(undefined), register });

        await expect(closeTrayNotifications(() => true)).resolves.toBeUndefined();
        expect(register).not.toHaveBeenCalled();
    });

    it('getNotifications lỗi thì không ném', async () => {
        stubNavigator('serviceWorker', {
            getRegistration: vi.fn().mockResolvedValue({ getNotifications: vi.fn().mockRejectedValue(new Error('boom')) }),
        });

        await expect(closeTrayNotifications(() => true)).resolves.toBeUndefined();
    });
});
