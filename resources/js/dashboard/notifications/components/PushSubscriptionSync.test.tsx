import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setLocale, t } from '../../../i18n';

const { pageProps, postJson, deleteJson } = vi.hoisted(() => ({
    pageProps: { current: {} as Record<string, unknown> },
    postJson: vi.fn(),
    deleteJson: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: pageProps.current }) }));
vi.mock('dashboard/helper/apiClient', () => ({ postJson, deleteJson }));

import PushSubscriptionSync from './PushSubscriptionSync';

const VAPID_KEY = 'BAECAwQ';
const PUSH_PREFERENCE_KEY_PREFIX = 'yona.push.preference.';
let nextUserId = 500;

function signIn({ hasEnabledHere }: { hasEnabledHere: boolean }): number {
    const userId = nextUserId++;
    if (hasEnabledHere) window.localStorage.setItem(`${PUSH_PREFERENCE_KEY_PREFIX}${userId}`, 'enabled');
    pageProps.current = {
        auth: { user: { id: userId, has_push_subscription: true } },
        globalConfig: { vapidPublicKey: VAPID_KEY },
    };

    return userId;
}

function installBrowserPush(permission: NotificationPermission, answer: NotificationPermission = 'granted') {
    const subscription = {
        endpoint: 'https://push.example/browser',
        options: { applicationServerKey: null },
        toJSON: () => ({ endpoint: 'https://push.example/browser', keys: { p256dh: 'p256dh-key', auth: 'auth-key' } }),
        unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const registration = {
        pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe: vi.fn().mockResolvedValue(subscription) },
    };
    Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration) },
    });
    vi.stubGlobal('PushManager', function PushManager() {});
    const requestPermission = vi.fn().mockResolvedValue(answer);
    vi.stubGlobal('Notification', { permission, requestPermission });

    return { requestPermission };
}

beforeEach(() => {
    setLocale('vi');
    window.localStorage.clear();
    postJson.mockReset().mockResolvedValue({});
    deleteJson.mockReset().mockResolvedValue(null);
});

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'serviceWorker');
});

const bannerText = () => t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_PERMISSION_REVOKED_BANNER');

describe('PushSubscriptionSync — nhắc khi quyền thông báo bị thu hồi', () => {
    it('hiện băng nhắc cho người đã bật trên trình duyệt này, bật lại thì băng biến mất', async () => {
        const browser = installBrowserPush('default');
        signIn({ hasEnabledHere: true });

        render(<PushSubscriptionSync />);

        expect(await screen.findByText(bannerText())).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_PERMISSION_REVOKED_ENABLE') }));

        await waitFor(() => expect(screen.queryByText(bannerText())).not.toBeInTheDocument());
        expect(browser.requestPermission).toHaveBeenCalledOnce();
        expect(postJson).toHaveBeenCalledOnce();
    });

    it('chọn tắt hẳn thì băng biến mất và không nhắc lại', async () => {
        installBrowserPush('denied');
        const userId = signIn({ hasEnabledHere: true });

        render(<PushSubscriptionSync />);
        fireEvent.click(
            await screen.findByRole('button', { name: t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.PUSH_PERMISSION_REVOKED_TURN_OFF') }),
        );

        await waitFor(() => expect(screen.queryByText(bannerText())).not.toBeInTheDocument());
        expect(window.localStorage.getItem(`${PUSH_PREFERENCE_KEY_PREFIX}${userId}`)).toBe('disabled');
    });

    it('không nhắc người chưa từng bật trên trình duyệt này', async () => {
        installBrowserPush('default');
        signIn({ hasEnabledHere: false });

        const { container } = render(<PushSubscriptionSync />);

        await new Promise(resolve => setTimeout(resolve, 0));
        expect(container).toBeEmptyDOMElement();
    });
});
