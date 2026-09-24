/* globals clients */
// Service worker chỉ lo thông báo đẩy, không chặn request nào (không có handler
// fetch). Payload do PushNotificationService gửi:
// { title, body, tag, url, icon, badge_count, data }. `tag` gom thông báo theo hội
// thoại; `data` chuyển nguyên vào thông báo để tab Yona tìm và đóng đúng cái khi
// hội thoại đã được đọc; SW không cần biết nghĩa từng trường.

self.addEventListener('install', () => self.skipWaiting());

// Nhận quyền điều khiển các tab dashboard đang mở ngay khi kích hoạt, để bấm
// thông báo có thể đưa đúng tab đó tới hội thoại.
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
    const notification = event.data ? event.data.json() : null;
    if (!notification) return;

    const tasks = [
        self.registration.showNotification(notification.title, {
            body: notification.body,
            tag: notification.tag,
            // Cùng hội thoại vẫn kêu lại. Không có tag mà renotify=true thì Chrome ném TypeError.
            renotify: Boolean(notification.tag),
            icon: notification.icon,
            data: { ...(notification.data || {}), url: notification.url },
        }),
    ];

    if (typeof notification.badge_count === 'number' && self.navigator && 'setAppBadge' in self.navigator) {
        tasks.push(self.navigator.setAppBadge(notification.badge_count).catch(() => undefined));
    }

    event.waitUntil(Promise.all(tasks));
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
