import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// public/sw.js chạy ngoài bundle nên nạp nguyên văn vào một phạm vi service worker
// giả: kiểm đúng thứ trình duyệt làm khi nhận push và khi người dùng bấm thông báo.

const SERVICE_WORKER_SOURCE = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');
const ORIGIN = 'https://yona.vn';
const CONVERSATION_URL = `${ORIGIN}/app/accounts/1/conversations/42`;

type Listener = (event: Record<string, unknown>) => void;

interface FakeWindowClient {
    url: string;
    frameType: 'top-level' | 'nested';
    focus: ReturnType<typeof vi.fn>;
    navigate: ReturnType<typeof vi.fn>;
}

function windowClient(url: string, frameType: FakeWindowClient['frameType'] = 'top-level'): FakeWindowClient {
    return { url, frameType, focus: vi.fn().mockResolvedValue(undefined), navigate: vi.fn().mockResolvedValue(null) };
}

function bootServiceWorker(openTabs: FakeWindowClient[]) {
    const listeners: Record<string, Listener> = {};
    const clients = {
        matchAll: vi.fn().mockResolvedValue(openTabs),
        openWindow: vi.fn().mockResolvedValue(null),
        claim: vi.fn().mockResolvedValue(undefined),
    };
    const self = {
        location: { origin: ORIGIN },
        registration: { showNotification: vi.fn().mockResolvedValue(undefined) },
        clients,
        skipWaiting: vi.fn(),
        addEventListener: (type: string, listener: Listener) => {
            listeners[type] = listener;
        },
    };

    new Function('self', 'clients', SERVICE_WORKER_SOURCE)(self, clients);

    const dispatch = async (type: string, event: Record<string, unknown>) => {
        let pending: Promise<unknown> = Promise.resolve();
        listeners[type]({ ...event, waitUntil: (promise: Promise<unknown>) => (pending = promise) });
        await pending;
    };

    return { self, clients, dispatch };
}

function clickNotification(url: string | undefined) {
    return { notification: { data: { url }, close: vi.fn() } };
}

describe('public/sw.js', () => {
    beforeEach(() => vi.clearAllMocks());

    it('hiện thông báo từ payload máy chủ gửi', async () => {
        const { self, dispatch } = bootServiceWorker([]);
        const payload = {
            title: 'Một hội thoại (#42) vừa được giao cho bạn',
            body: 'Lan: Shop còn size M không ạ?',
            tag: 'conversation_assignment_42_7',
            url: CONVERSATION_URL,
            icon: `${ORIGIN}/logo.png`,
        };

        await dispatch('push', { data: { json: () => payload } });

        expect(self.registration.showNotification).toHaveBeenCalledWith(payload.title, {
            body: payload.body,
            tag: payload.tag,
            icon: payload.icon,
            data: { url: CONVERSATION_URL },
        });
    });

    it('bấm thông báo khi đã có tab đúng hội thoại thì chỉ đưa tab đó lên', async () => {
        const conversationTab = windowClient(CONVERSATION_URL);
        const { clients, dispatch } = bootServiceWorker([windowClient(`${ORIGIN}/app/accounts/1/dashboard`), conversationTab]);
        const event = clickNotification(CONVERSATION_URL);

        await dispatch('notificationclick', event);

        expect(event.notification.close).toHaveBeenCalledOnce();
        expect(conversationTab.focus).toHaveBeenCalledOnce();
        expect(conversationTab.navigate).not.toHaveBeenCalled();
        expect(clients.openWindow).not.toHaveBeenCalled();
    });

    it('bấm thông báo khi Yona đang mở trang khác thì đưa tab đó tới hội thoại', async () => {
        const dashboardTab = windowClient(`${ORIGIN}/app/accounts/1/conversations/7`);
        const { clients, dispatch } = bootServiceWorker([windowClient('https://shop.example/'), dashboardTab]);

        await dispatch('notificationclick', clickNotification(CONVERSATION_URL));

        expect(dashboardTab.focus).toHaveBeenCalledOnce();
        expect(dashboardTab.navigate).toHaveBeenCalledWith(CONVERSATION_URL);
        expect(clients.openWindow).not.toHaveBeenCalled();
    });

    it('không điều hướng iframe cùng tên miền, mở cửa sổ mới thay vào đó', async () => {
        const embeddedFrame = windowClient(`${ORIGIN}/widget?website_token=abc`, 'nested');
        const { clients, dispatch } = bootServiceWorker([embeddedFrame]);

        await dispatch('notificationclick', clickNotification(CONVERSATION_URL));

        expect(embeddedFrame.navigate).not.toHaveBeenCalled();
        expect(clients.openWindow).toHaveBeenCalledWith(CONVERSATION_URL);
    });

    it('tab không điều hướng được thì mở cửa sổ mới', async () => {
        const uncontrolledTab = windowClient(`${ORIGIN}/app/accounts/1/dashboard`);
        uncontrolledTab.navigate.mockRejectedValue(new TypeError('not controlled'));
        const { clients, dispatch } = bootServiceWorker([uncontrolledTab]);

        await dispatch('notificationclick', clickNotification(CONVERSATION_URL));

        expect(clients.openWindow).toHaveBeenCalledWith(CONVERSATION_URL);
    });

    it('không có tab Yona nào thì mở cửa sổ mới tới hội thoại', async () => {
        const { clients, dispatch } = bootServiceWorker([]);

        await dispatch('notificationclick', clickNotification(CONVERSATION_URL));

        expect(clients.openWindow).toHaveBeenCalledWith(CONVERSATION_URL);
    });
});
