/* globals clients */
// Service worker lo thông báo đẩy và điều kiện cài đặt PWA. Handler fetch chỉ
// chặn điều hướng trang (network-first, mất mạng thì trả trang offline dựng sẵn);
// không cache gì, API và tài nguyên tĩnh đi thẳng mạng. Payload push do PushNotificationService gửi:
// { title, body, tag, url, icon, badge_count, data }. `tag` gom thông báo theo hội
// thoại; `data` chuyển nguyên vào thông báo để tab Yona tìm và đóng đúng cái khi
// hội thoại đã được đọc; SW không cần biết nghĩa từng trường.

self.addEventListener('install', () => self.skipWaiting());

// Nhận quyền điều khiển các tab dashboard đang mở ngay khi kích hoạt, để bấm
// thông báo có thể đưa đúng tab đó tới hội thoại.
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

const OFFLINE_PAGE = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Yona</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:system-ui,sans-serif;background:#fff;color:#041738;text-align:center;padding:16px}
button{margin-top:16px;padding:10px 20px;border:0;border-radius:8px;background:#041738;color:#fff;font-size:15px}</style>
</head><body><div><h1 style="font-size:20px">Bạn đang ngoại tuyến</h1>
<p>Kiểm tra kết nối mạng rồi thử lại.</p>
<button onclick="location.reload()">Thử lại</button></div></body></html>`;

self.addEventListener('fetch', event => {
    const { request } = event;
    if (request.mode !== 'navigate' || request.method !== 'GET') return;
    if (new URL(request.url).pathname.startsWith('/api/')) return;

    event.respondWith(
        fetch(request).catch(
            () => new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
        ),
    );
});

// Đang có tab Yona hiện trên màn hình thì tab đó tự hiện hộp báo trong trang (NewMessageToasts):
// không bắn thêm thông báo của hệ điều hành. Tab ẩn hoặc đã đóng thì báo như cũ.
async function hasVisibleDashboard() {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    return windowClients.some(
        client =>
            client.frameType === 'top-level' &&
            client.visibilityState === 'visible' &&
            new URL(client.url).pathname.startsWith('/app/'),
    );
}

async function showPushNotification(notification) {
    if (await hasVisibleDashboard()) return;

    await self.registration.showNotification(notification.title, {
        body: notification.body,
        tag: notification.tag,
        // Cùng hội thoại vẫn kêu lại. Không có tag mà renotify=true thì Chrome ném TypeError.
        renotify: Boolean(notification.tag),
        icon: notification.icon,
        data: { ...(notification.data || {}), url: notification.url },
    });
}

self.addEventListener('push', event => {
    const notification = event.data ? event.data.json() : null;
    if (!notification) return;

    const tasks = [showPushNotification(notification)];

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
