/* globals clients */
// Port từ refs/chatwoot/public/sw.js — service worker chỉ lo thông báo đẩy, không
// chặn request nào (không có handler fetch). Payload do PushNotificationService
// gửi: { title, body, tag, url, icon }.

self.addEventListener('install', () => self.skipWaiting());

// Nhận quyền điều khiển các tab dashboard đang mở ngay khi kích hoạt, để bấm
// thông báo có thể đưa đúng tab đó tới hội thoại.
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
    const notification = event.data ? event.data.json() : null;
    if (!notification) return;

    event.waitUntil(
        self.registration.showNotification(notification.title, {
            body: notification.body,
            tag: notification.tag,
            icon: notification.icon,
            data: { url: notification.url },
        }),
    );
});

async function focusConversation(url) {
    // Chỉ tab trên cùng: iframe cùng tên miền (khung Dashboard App, bản xem thử
    // widget) mà bị điều hướng thì dashboard sẽ mở lọt vào trong khung đó.
    const windowClients = (await clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(
        client => client.frameType === 'top-level',
    );
    const exactClient = windowClients.find(client => client.url === url);

    if (exactClient) {
        return exactClient.focus();
    }

    const dashboardClient = windowClients.find(
        client => new URL(client.url).origin === self.location.origin && 'navigate' in client,
    );

    // Focus trước khi điều hướng: quyền focus chỉ còn trong chốc lát sau cú bấm.
    if (dashboardClient) {
        try {
            await dashboardClient.focus();
            await dashboardClient.navigate(url);
            return undefined;
        } catch {
            // Tab không do service worker này điều khiển thì không điều hướng được.
        }
    }

    return clients.openWindow(url);
}

self.addEventListener('notificationclick', event => {
    const url = event.notification.data && event.notification.data.url;
    event.notification.close();

    if (!url) return;

    event.waitUntil(focusConversation(url));
});
