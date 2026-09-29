import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { postJson, deleteJson } = vi.hoisted(() => ({ postJson: vi.fn(), deleteJson: vi.fn() }));
vi.mock('./apiClient', () => ({ postJson, deleteJson }));

import {
    PushPermissionDeniedError,
    PushServiceUnavailableError,
    detachPushOnLogout,
    disablePush,
    enablePush,
    isPushSupported,
    syncPushSubscription,
    urlBase64ToUint8Array,
} from './pushHelper';

// Port từ dashboard/helper/specs/pushHelper.spec.js — trình duyệt giả lập đủ
// service worker + PushManager + Notification để chạy đúng luồng đăng ký.

const VAPID_KEY = 'BAECAwQ';
const OTHER_VAPID_KEY = 'BAUGBwg';
const USER_ID = 7;

// Kết quả đồng bộ nhớ theo user trong module: mỗi test một user riêng.
let nextUserId = 100;
const freshUserId = () => nextUserId++;

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
    window.localStorage.clear();
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

        await enablePush(VAPID_KEY, USER_ID);

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

        await expect(enablePush(VAPID_KEY, USER_ID)).rejects.toBeInstanceOf(PushPermissionDeniedError);

        expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
        expect(postJson).not.toHaveBeenCalled();
    });

    it('reuses the existing subscription when it was made with the same key', async () => {
        const existing = fakeSubscription('https://push.example/existing', VAPID_KEY);
        const browser = installBrowserPush({ permission: 'granted', existing });

        await enablePush(VAPID_KEY, USER_ID);

        expect(browser.requestPermission).not.toHaveBeenCalled();
        expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
        expect(postJson.mock.calls[0][1].subscription_attributes.endpoint).toBe('https://push.example/existing');
    });

    it('replaces a subscription made with an old server key', async () => {
        const stale = fakeSubscription('https://push.example/stale', OTHER_VAPID_KEY);
        const browser = installBrowserPush({ permission: 'granted', existing: stale });

        await enablePush(VAPID_KEY, USER_ID);

        expect(stale.unsubscribe).toHaveBeenCalledOnce();
        expect(browser.pushManager.subscribe).toHaveBeenCalledOnce();
        expect(postJson.mock.calls[0][1].subscription_attributes.endpoint).toBe('https://push.example/new');
    });
});

describe('disablePush', () => {
    it('unsubscribes this browser and deletes its record on the server', async () => {
        const existing = fakeSubscription('https://push.example/existing', VAPID_KEY);
        installBrowserPush({ permission: 'granted', existing });

        await disablePush(USER_ID);

        expect(existing.unsubscribe).toHaveBeenCalledOnce();
        expect(deleteJson).toHaveBeenCalledWith('/api/v1/notification_subscriptions', {
            endpoint: 'https://push.example/existing',
        });
    });

    it('does nothing when this browser never subscribed', async () => {
        installBrowserPush({ permission: 'granted' });

        await disablePush(USER_ID);

        expect(deleteJson).not.toHaveBeenCalled();
    });
});

describe('syncPushSubscription', () => {
    it('re-sends an existing subscription once per signed-in user', async () => {
        const existing = fakeSubscription('https://push.example/existing', VAPID_KEY);
        installBrowserPush({ permission: 'granted', existing });
        const [firstUser, secondUser] = [freshUserId(), freshUserId()];

        expect(await syncPushSubscription(firstUser, VAPID_KEY, true)).toBe('subscribed');
        await syncPushSubscription(firstUser, VAPID_KEY, true);
        expect(postJson).toHaveBeenCalledTimes(1);

        await syncPushSubscription(secondUser, VAPID_KEY, false);
        expect(postJson).toHaveBeenCalledTimes(2);
    });

    it('never prompts or subscribes a browser that has not opted in', async () => {
        const browser = installBrowserPush({ permission: 'default' });

        expect(await syncPushSubscription(freshUserId(), VAPID_KEY, false)).toBe('off');

        expect(browser.requestPermission).not.toHaveBeenCalled();
        expect(browser.serviceWorker.register).not.toHaveBeenCalled();
        expect(postJson).not.toHaveBeenCalled();
    });

    it('lặng lẽ đăng ký lại khi quyền còn mà trình duyệt mất đăng ký của người đã bật', async () => {
        const userId = freshUserId();
        const browser = installBrowserPush({ permission: 'granted' });
        await enablePush(VAPID_KEY, userId);
        browser.pushManager.getSubscription.mockResolvedValue(null);
        browser.pushManager.subscribe.mockClear();
        postJson.mockClear();

        browser.pushManager.subscribe.mockImplementation(async () => {
            browser.pushManager.getSubscription.mockResolvedValue(browser.created);
            return browser.created;
        });

        expect(await syncPushSubscription(userId, VAPID_KEY, false)).toBe('subscribed');
        expect(browser.requestPermission).not.toHaveBeenCalled();
        expect(browser.pushManager.subscribe).toHaveBeenCalledOnce();
        expect(postJson.mock.calls[0][1].subscription_attributes.endpoint).toBe('https://push.example/new');
    });

    it('trình duyệt quên cả lựa chọn đã nhớ thì dựa vào đăng ký còn trên máy chủ', async () => {
        const browser = installBrowserPush({ permission: 'granted' });
        browser.pushManager.subscribe.mockImplementation(async () => {
            browser.pushManager.getSubscription.mockResolvedValue(browser.created);
            return browser.created;
        });

        expect(await syncPushSubscription(freshUserId(), VAPID_KEY, false)).toBe('off');
        expect(browser.pushManager.subscribe).not.toHaveBeenCalled();

        expect(await syncPushSubscription(freshUserId(), VAPID_KEY, true)).toBe('subscribed');
        expect(browser.pushManager.subscribe).toHaveBeenCalledOnce();
    });

    it('không tự bật lại cho người đã tắt trên trình duyệt này dù máy chủ còn đăng ký ở máy khác', async () => {
        const userId = freshUserId();
        const browser = installBrowserPush({ permission: 'granted' });
        await disablePush(userId);

        expect(await syncPushSubscription(userId, VAPID_KEY, true)).toBe('off');
        expect(browser.pushManager.subscribe).not.toHaveBeenCalled();
        expect(postJson).not.toHaveBeenCalled();
    });

    it('báo quyền bị thu hồi khi người đã bật trên trình duyệt này mất quyền thông báo', async () => {
        const userId = freshUserId();
        installBrowserPush({ permission: 'granted' });
        await enablePush(VAPID_KEY, userId);

        const browser = installBrowserPush({ permission: 'default' });

        expect(await syncPushSubscription(userId, VAPID_KEY, true)).toBe('permission_revoked');
        expect(browser.requestPermission).not.toHaveBeenCalled();
    });

    it('chưa từng bật trên trình duyệt này thì không nhắc, dù đã bật ở máy khác', async () => {
        installBrowserPush({ permission: 'default' });

        expect(await syncPushSubscription(freshUserId(), VAPID_KEY, true)).toBe('off');
    });

    it('đăng ký lại hỏng thì công tắc theo trình duyệt thật, không ném lỗi', async () => {
        const browser = installBrowserPush({ permission: 'granted' });
        browser.pushManager.subscribe.mockRejectedValue(new DOMException('push service error', 'AbortError'));

        expect(await syncPushSubscription(freshUserId(), VAPID_KEY, true)).toBe('off');
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

describe('enablePush khi dịch vụ đẩy của trình duyệt từ chối', () => {
    afterEach(() => Reflect.deleteProperty(navigator, 'brave'));

    it('đổi AbortError của subscribe thành lỗi dịch vụ đẩy, đánh dấu Brave', async () => {
        const browser = installBrowserPush({ permission: 'granted' });
        browser.pushManager.subscribe.mockRejectedValue(new DOMException('Registration failed - push service error', 'AbortError'));
        Object.defineProperty(navigator, 'brave', { configurable: true, value: {} });

        const failure = enablePush(VAPID_KEY, USER_ID);

        await expect(failure).rejects.toBeInstanceOf(PushServiceUnavailableError);
        await expect(failure).rejects.toMatchObject({ isBrave: true });
        expect(postJson).not.toHaveBeenCalled();
    });

    it('giữ nguyên lỗi khác của subscribe', async () => {
        const browser = installBrowserPush({ permission: 'granted' });
        browser.pushManager.subscribe.mockRejectedValue(new DOMException('bad key', 'InvalidAccessError'));

        await expect(enablePush(VAPID_KEY, USER_ID)).rejects.toMatchObject({ name: 'InvalidAccessError' });
    });
});
