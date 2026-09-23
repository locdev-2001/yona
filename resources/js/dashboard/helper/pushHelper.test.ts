import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { postJson, deleteJson } = vi.hoisted(() => ({ postJson: vi.fn(), deleteJson: vi.fn() }));
vi.mock('./apiClient', () => ({ postJson, deleteJson }));

import {
    PushPermissionDeniedError,
    detachPushOnLogout,
    disablePush,
    enablePush,
    isPushSupported,
    refreshPushSubscription,
    urlBase64ToUint8Array,
} from './pushHelper';

// Port từ dashboard/helper/specs/pushHelper.spec.js — trình duyệt giả lập đủ
// service worker + PushManager + Notification để chạy đúng luồng đăng ký.

const VAPID_KEY = 'BAECAwQ';
const OTHER_VAPID_KEY = 'BAUGBwg';

interface FakeSubscription {
    endpoint: string;
    options: { applicationServerKey: ArrayBuffer | null };
    toJSON: () => { endpoint: string; keys: { p256dh: string; auth: string } };
    unsubscribe: ReturnType<typeof vi.fn>;
}

function fakeSubscription(endpoint: string, vapidKey: string): FakeSubscription {
    return {
        endpoint,
        options: { applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer },
        toJSON: () => ({ endpoint, keys: { p256dh: `p256dh-of-${endpoint}`, auth: `auth-of-${endpoint}` } }),
        unsubscribe: vi.fn().mockResolvedValue(true),
    };
}

function installBrowserPush({
    permission = 'default' as NotificationPermission,
    answer = 'granted' as NotificationPermission,
    existing = null as FakeSubscription | null,
} = {}) {
    const created = fakeSubscription('https://push.example/new', VAPID_KEY);
    const pushManager = {
        getSubscription: vi.fn().mockResolvedValue(existing),
        subscribe: vi.fn().mockResolvedValue(created),
    };
    const registration = { pushManager };
    const serviceWorker = { register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration) };
    const requestPermission = vi.fn().mockResolvedValue(answer);

    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
    vi.stubGlobal('PushManager', function PushManager() {});
    vi.stubGlobal('Notification', { permission, requestPermission });

    return { created, pushManager, serviceWorker, requestPermission };
}

beforeEach(() => {
    postJson.mockReset().mockResolvedValue({});
    deleteJson.mockReset().mockResolvedValue(null);
});

afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('isPushSupported', () => {
    it('needs both the server VAPID key and the browser Push API', () => {
        installBrowserPush();

        expect(isPushSupported(VAPID_KEY)).toBe(true);
        expect(isPushSupported(null)).toBe(false);
        expect(isPushSupported('')).toBe(false);
    });

    it('is false on a browser without service workers even when the server has a key', () => {
        expect(isPushSupported(VAPID_KEY)).toBe(false);
    });
});

describe('urlBase64ToUint8Array', () => {
    it('decodes an unpadded base64url VAPID key into raw bytes', () => {
        expect(Array.from(urlBase64ToUint8Array(VAPID_KEY))).toEqual([4, 1, 2, 3, 4]);
        expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255]);
    });
});

describe('enablePush', () => {
    it('asks for permission, subscribes with the server key and saves the subscription', async () => {
        const browser = installBrowserPush();

        await enablePush(VAPID_KEY);

        expect(browser.requestPermission).toHaveBeenCalledOnce();
        expect(browser.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
        expect(browser.pushManager.subscribe).toHaveBeenCalledWith({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY),
        });
        expect(postJson).toHaveBeenCalledWith('/api/v1/notification_subscriptions', {
            subscription_type: 'browser_push',
            subscription_attributes: {
                endpoint: 'https://push.example/new',
                p256dh: 'p256dh-of-https://push.example/new',
                auth: 'auth-of-https://push.example/new',
            },
        });
    });

    it('stops without subscribing when the user blocks notifications', async () => {
        const browser = installBrowserPush({ answer: 'denied' });

        await expect(enablePush(VAPID_KEY)).rejects.toBeInstanceOf(PushPermissionDeniedError);

        expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
        expect(postJson).not.toHaveBeenCalled();
    });

    it('reuses the existing subscription when it was made with the same key', async () => {
        const existing = fakeSubscription('https://push.example/existing', VAPID_KEY);
        const browser = installBrowserPush({ permission: 'granted', existing });

        await enablePush(VAPID_KEY);

        expect(browser.requestPermission).not.toHaveBeenCalled();
        expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
        expect(postJson.mock.calls[0][1].subscription_attributes.endpoint).toBe('https://push.example/existing');
    });

    it('replaces a subscription made with an old server key', async () => {
        const stale = fakeSubscription('https://push.example/stale', OTHER_VAPID_KEY);
        const browser = installBrowserPush({ permission: 'granted', existing: stale });

        await enablePush(VAPID_KEY);

        expect(stale.unsubscribe).toHaveBeenCalledOnce();
        expect(browser.pushManager.subscribe).toHaveBeenCalledOnce();
        expect(postJson.mock.calls[0][1].subscription_attributes.endpoint).toBe('https://push.example/new');
    });
});

describe('disablePush', () => {
    it('unsubscribes this browser and deletes its record on the server', async () => {
        const existing = fakeSubscription('https://push.example/existing', VAPID_KEY);
        installBrowserPush({ permission: 'granted', existing });

        await disablePush();

        expect(existing.unsubscribe).toHaveBeenCalledOnce();
        expect(deleteJson).toHaveBeenCalledWith('/api/v1/notification_subscriptions', {
            endpoint: 'https://push.example/existing',
        });
    });

    it('does nothing when this browser never subscribed', async () => {
        installBrowserPush({ permission: 'granted' });

        await disablePush();

        expect(deleteJson).not.toHaveBeenCalled();
    });
});

describe('refreshPushSubscription', () => {
    it('re-sends an existing subscription once per signed-in user', async () => {
        const existing = fakeSubscription('https://push.example/existing', VAPID_KEY);
        installBrowserPush({ permission: 'granted', existing });

        await refreshPushSubscription(41, VAPID_KEY);
        await refreshPushSubscription(41, VAPID_KEY);
        expect(postJson).toHaveBeenCalledTimes(1);

        await refreshPushSubscription(42, VAPID_KEY);
        expect(postJson).toHaveBeenCalledTimes(2);
    });

    it('never prompts or subscribes a browser that has not opted in', async () => {
        const browser = installBrowserPush({ permission: 'default' });

        await refreshPushSubscription(43, VAPID_KEY);

        expect(browser.requestPermission).not.toHaveBeenCalled();
        expect(browser.serviceWorker.register).not.toHaveBeenCalled();
        expect(postJson).not.toHaveBeenCalled();
    });
});

describe('detachPushOnLogout', () => {
    function installRegistration(existing: FakeSubscription | null, hasRegistration = true) {
        const register = vi.fn();
        const registration = { pushManager: { getSubscription: vi.fn().mockResolvedValue(existing) } };
        const getRegistration = vi.fn().mockResolvedValue(hasRegistration ? registration : undefined);
        Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register, getRegistration } });

        return { register, getRegistration };
    }

    it('gỡ đăng ký của trình duyệt và xoá bản ghi phía máy chủ', async () => {
        const existing = fakeSubscription('https://push.example/shared-pc', VAPID_KEY);
        const { register } = installRegistration(existing);

        await detachPushOnLogout();

        expect(existing.unsubscribe).toHaveBeenCalledOnce();
        expect(deleteJson).toHaveBeenCalledWith('/api/v1/notification_subscriptions', {
            endpoint: 'https://push.example/shared-pc',
        });
        expect(register).not.toHaveBeenCalled();
    });

    it('không đăng ký service worker mới chỉ để gỡ', async () => {
        const { register } = installRegistration(null, false);

        await detachPushOnLogout();

        expect(register).not.toHaveBeenCalled();
        expect(deleteJson).not.toHaveBeenCalled();
    });

    it('trình duyệt không có service worker thì không làm gì', async () => {
        await detachPushOnLogout();

        expect(deleteJson).not.toHaveBeenCalled();
    });
});
