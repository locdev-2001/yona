import type { GlobalConfig } from '../../types';
import { deleteJson, postJson } from './apiClient';

// Port từ dashboard/helper/pushHelper.js: service worker + PushManager của trình
// duyệt, đăng ký lưu ở /api/v1/notification_subscriptions.

export const SERVICE_WORKER_URL = '/sw.js';
const SUBSCRIPTIONS_URL = '/api/v1/notification_subscriptions';

// Khoá VAPID công khai — máy chủ (HandleInertiaRequests) chỉ gửi
// khoá khi gửi được push.
export function vapidPublicKeyOf(globalConfig: GlobalConfig | undefined): string | null {
    return globalConfig?.vapidPublicKey ?? null;
}

export class PushPermissionDeniedError extends Error {
    constructor() {
        super('Push notification permission denied');
    }
}

// Điểm quyết định duy nhất phía giao diện: máy chủ có khoá VAPID VÀ trình duyệt
// có đủ service worker + Push API. Thiếu một trong hai thì không hiện gì về push.
export function isPushSupported(vapidPublicKey: string | null | undefined): vapidPublicKey is string {
    return (
        Boolean(vapidPublicKey) &&
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    );
}

export function hasPushPermission(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
}

async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    await navigator.serviceWorker.register(SERVICE_WORKER_URL);

    return navigator.serviceWorker.ready;
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
    const registration = await serviceWorkerRegistration();

    return registration.pushManager.getSubscription();
}

// Khoá VAPID base64url → byte cho applicationServerKey (bản gốc giải mã sẵn ở
// layout vueapp.html.erb).
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
    const base64 = `${base64Url}${'='.repeat((4 - (base64Url.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);

    return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function isSignedWith(subscription: PushSubscription, applicationServerKey: Uint8Array): boolean {
    const currentKey = subscription.options.applicationServerKey;
    if (!currentKey) return false;

    const currentBytes = new Uint8Array(currentKey);

    return (
        currentBytes.length === applicationServerKey.length &&
        currentBytes.every((byte, index) => byte === applicationServerKey[index])
    );
}

// Đăng ký cũ gắn với cặp khoá VAPID khác (máy chủ đổi khoá) thì subscribe() ném
// lỗi — gỡ đăng ký cũ rồi đăng ký lại bằng khoá hiện tại.
async function subscribe(vapidPublicKey: string): Promise<PushSubscription> {
    const registration = await serviceWorkerRegistration();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    const existing = await registration.pushManager.getSubscription();

    if (existing && isSignedWith(existing, applicationServerKey)) {
        return existing;
    }

    await existing?.unsubscribe();

    return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
}

function sendSubscriptionToServer(subscription: PushSubscription): Promise<unknown> {
    const { endpoint, keys } = subscription.toJSON();

    return postJson(SUBSCRIPTIONS_URL, {
        subscription_type: 'browser_push',
        subscription_attributes: { endpoint, p256dh: keys?.p256dh, auth: keys?.auth },
    });
}

// Trình duyệt có Push API và đã cho quyền, nhưng dịch vụ đẩy của nó từ chối đăng
// ký: Brave tắt dịch vụ đẩy của Google theo mặc định, Chromium bản không kèm khoá
// Google cũng vậy. subscribe() khi đó ném AbortError.
export class PushServiceUnavailableError extends Error {
    constructor(readonly isBrave: boolean) {
        super('Push service unavailable in this browser');
    }
}

// requestPushPermissions + registerSubscription.
export async function enablePush(vapidPublicKey: string): Promise<void> {
    const permission = hasPushPermission() ? 'granted' : await Notification.requestPermission();

    if (permission !== 'granted') {
        throw new PushPermissionDeniedError();
    }

    let subscription: PushSubscription;
    try {
        subscription = await subscribe(vapidPublicKey);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new PushServiceUnavailableError('brave' in navigator);
        }
        throw error;
    }

    await sendSubscriptionToServer(subscription);
}

// Bản gốc chỉ gỡ ở trình duyệt; xoá luôn bản ghi phía máy chủ để không còn đẩy
// vào một endpoint đã chết.
export async function disablePush(): Promise<void> {
    const subscription = await getPushSubscription();
    if (!subscription) return;

    const { endpoint } = subscription;
    await subscription.unsubscribe();
    await deleteJson(SUBSCRIPTIONS_URL, { endpoint });
}

// Máy tính dùng chung ở cửa hàng: đăng xuất mà trình duyệt vẫn giữ đăng ký thì
// người dùng sau tiếp tục nhận thông báo (kèm trích tin khách) của người trước.
// Chỉ đọc đăng ký đang có — không đăng ký service worker mới chỉ để gỡ.
export async function detachPushOnLogout(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;

    const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    const { endpoint } = subscription;
    await subscription.unsubscribe();
    await deleteJson(SUBSCRIPTIONS_URL, { endpoint });
}

let refreshedForUserId: number | null = null;

// App.vue lúc mở dashboard: trình duyệt đã đăng ký thì gửi lại cho máy chủ — bản
// ghi có thể đã bị xoá (410) hoặc trình duyệt vừa đổi sang user khác. Đăng xuất
// rồi đăng nhập không tải lại trang (Inertia) nên nhớ theo user, không theo lượt tải.
export async function refreshPushSubscription(
    userId: number | undefined,
    vapidPublicKey: string | null | undefined,
): Promise<void> {
    if (userId === undefined || refreshedForUserId === userId) return;
    if (!isPushSupported(vapidPublicKey) || !hasPushPermission()) return;
    refreshedForUserId = userId;

    if (!(await getPushSubscription())) return;

    await sendSubscriptionToServer(await subscribe(vapidPublicKey));
}
