import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import { setLocale, t } from '../../../i18n';

const { pageProps, postJson, deleteJson } = vi.hoisted(() => ({
    pageProps: { current: {} as Record<string, unknown> },
    postJson: vi.fn(),
    deleteJson: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: pageProps.current }) }));
vi.mock('dashboard/helper/apiClient', () => ({ postJson, deleteJson }));
vi.mock('dashboard/notifications/api', () => ({
    fetchNotificationSettings: vi.fn().mockResolvedValue({
        selected_email_flags: ['email_conversation_assignment'],
        selected_push_flags: ['push_conversation_assignment'],
    }),
    updateNotificationSettings: vi.fn().mockResolvedValue({}),
}));

import NotificationPreferences from './NotificationPreferences';

// Cột "Thông báo đẩy" và công tắc trình duyệt chỉ hiện khi máy chủ gửi được push
// (có khoá VAPID) và trình duyệt có Push API; bật công tắc = đăng ký thật.

const VAPID_KEY = 'BAECAwQ';

function withVapidKey(vapidPublicKey: string | null) {
    pageProps.current = {
        currentAccount: { id: 5 },
        globalConfig: { vapidPublicKey },
    };
}

function installBrowserPush() {
    const subscription = {
        endpoint: 'https://push.example/browser',
        options: { applicationServerKey: null },
        toJSON: () => ({ endpoint: 'https://push.example/browser', keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
        unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const pushManager = {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: vi.fn().mockResolvedValue(subscription),
    };
    const registration = { pushManager };
    const serviceWorker = { register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration) };
    const requestPermission = vi.fn().mockResolvedValue('granted');

    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
    vi.stubGlobal('PushManager', function PushManager() {});
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });

    return { pushManager, serviceWorker, requestPermission };
}

beforeEach(() => {
    setLocale('vi');
    postJson.mockReset().mockResolvedValue({});
    deleteJson.mockReset().mockResolvedValue(null);
});

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('NotificationPreferences — thông báo đẩy', () => {
    it('ẩn cột thông báo đẩy và công tắc khi máy chủ không có khoá VAPID', () => {
        installBrowserPush();
        withVapidKey(null);

        render(<NotificationPreferences />);

        expect(screen.queryAllByText(t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH'))).toHaveLength(0);
        expect(screen.queryAllByText(t('PROFILE_SETTINGS.FORM.PUSH_NOTIFICATIONS_SECTION.TITLE'))).toHaveLength(0);
        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
        expect(document.querySelector('input[value^="push_"]')).toBeNull();
        expect(document.querySelector('input[value="email_conversation_assignment"]')).not.toBeNull();
    });

    it('ẩn khi trình duyệt không có Push API dù máy chủ có khoá', () => {
        withVapidKey(VAPID_KEY);

        render(<NotificationPreferences />);

        expect(screen.queryByRole('switch')).not.toBeInTheDocument();
        expect(document.querySelector('input[value^="push_"]')).toBeNull();
    });

    it('bật công tắc thì xin quyền, đăng ký service worker và lưu đăng ký lên máy chủ', async () => {
        const browser = installBrowserPush();
        withVapidKey(VAPID_KEY);

        render(<NotificationPreferences />);

        expect(screen.getAllByText(t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH')).length).toBeGreaterThan(0);
        expect(document.querySelector('input[value="push_conversation_assignment"]')).not.toBeNull();

        const toggle = screen.getByRole('switch');
        expect(toggle).toHaveAttribute('aria-checked', 'false');

        fireEvent.click(toggle);

        await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
        expect(browser.requestPermission).toHaveBeenCalledOnce();
        expect(browser.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
        expect(browser.pushManager.subscribe).toHaveBeenCalledOnce();
        expect(postJson).toHaveBeenCalledWith('/api/v1/notification_subscriptions', {
            subscription_type: 'browser_push',
            subscription_attributes: { endpoint: 'https://push.example/browser', p256dh: 'p256dh-key', auth: 'auth-key' },
        });
    });

    it('giữ công tắc tắt và không lưu gì khi người dùng chặn thông báo', async () => {
        const browser = installBrowserPush();
        browser.requestPermission.mockResolvedValue('denied');
        withVapidKey(VAPID_KEY);

        render(<NotificationPreferences />);
        const toggle = screen.getByRole('switch');
        fireEvent.click(toggle);

        await waitFor(() => expect(browser.requestPermission).toHaveBeenCalledOnce());
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
        expect(postJson).not.toHaveBeenCalled();
    });

    it('báo không bật được, không đổ lỗi cho trình duyệt, khi máy chủ không lưu được đăng ký', async () => {
        installBrowserPush();
        postJson.mockRejectedValue(new Error('Network error'));
        withVapidKey(VAPID_KEY);
        const toasts: string[] = [];
        const onToast = (payload: unknown) => {
            toasts.push((payload as { message: string }).message);
        };
        emitter.on(BUS_EVENTS.SHOW_TOAST, onToast);

        render(<NotificationPreferences />);
        const toggle = screen.getByRole('switch');
        fireEvent.click(toggle);

        await waitFor(() => expect(toasts).toContain(t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_ENABLE_FAILED')));
        expect(toggle).toHaveAttribute('aria-checked', 'false');
        emitter.off(BUS_EVENTS.SHOW_TOAST, onToast);
    });
});
