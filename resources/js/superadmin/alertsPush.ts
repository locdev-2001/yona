import { xsrfToken } from 'dashboard/helper/apiClient';
import {
    PushPermissionDeniedError,
    SERVICE_WORKER_URL,
    hasPushPermission,
    isPushSupported,
    urlBase64ToUint8Array,
} from 'dashboard/helper/pushHelper';

// Thông báo đẩy cho super admin: cùng service worker (/sw.js), cùng khoá VAPID và
// cùng bảng notification_subscriptions với thông báo hội thoại của agent; chỉ khác
// đường lưu đăng ký (guard super_admin không gọi được API của agent).

export { PushPermissionDeniedError, isPushSupported };

async function registration(): Promise<ServiceWorkerRegistration> {
    await navigator.serviceWorker.register(SERVICE_WORKER_URL);

    return navigator.serviceWorker.ready;
}

async function send(endpoint: string, method: 'POST' | 'DELETE', body: unknown): Promise<void> {
    const response = await fetch(endpoint, {
        method,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
}

function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
    const current = subscription.options.applicationServerKey;
    if (!current) return false;
    const bytes = new Uint8Array(current);

    return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator)) return null;
    const existing = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);

    return (await existing?.pushManager.getSubscription()) ?? null;
}

export async function enableAdminPush(vapidPublicKey: string, endpoint: string): Promise<void> {
    const permission = hasPushPermission() ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') throw new PushPermissionDeniedError();

    const worker = await registration();
    const key = urlBase64ToUint8Array(vapidPublicKey);
    let subscription = await worker.pushManager.getSubscription();

    if (!subscription || !sameKey(subscription, key)) {
        await subscription?.unsubscribe();
        subscription = await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    }

    const { keys } = subscription.toJSON();
    await send(endpoint, 'POST', { endpoint: subscription.endpoint, p256dh: keys?.p256dh, auth: keys?.auth });
}

export async function disableAdminPush(endpoint: string): Promise<void> {
    const subscription = await currentPushSubscription();
    if (!subscription) return;

    const subscriptionEndpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await send(endpoint, 'DELETE', { endpoint: subscriptionEndpoint });
}
