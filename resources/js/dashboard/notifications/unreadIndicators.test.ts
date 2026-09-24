import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TrayNotificationData } from 'dashboard/helper/notificationTray';
import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';

type TrayPredicate = (data: TrayNotificationData) => boolean;

const tray = vi.hoisted(() => ({
    applyUnreadTitle: vi.fn(),
    setAppBadgeCount: vi.fn(async () => undefined),
    closeTrayNotifications: vi.fn(async (_predicate: (data: Record<string, unknown>) => boolean) => undefined),
}));
vi.mock('dashboard/helper/notificationTray', () => tray);

const api = vi.hoisted(() => ({
    fetchUnreadCount: vi.fn(),
    fetchNotifications: vi.fn(),
}));
vi.mock('./api', () => api);

const navigateListeners = vi.hoisted(() => new Set<() => void>());
vi.mock('@inertiajs/react', () => ({
    router: {
        on: (eventName: string, listener: () => void) => {
            if (eventName !== 'navigate') return () => undefined;
            navigateListeners.add(listener);
            return () => navigateListeners.delete(listener);
        },
    },
}));

import { bindUnreadIndicators, clearUnreadIndicators } from './unreadIndicators';

const ACCOUNT_ID = 2;

function unreadNotification(primaryActorId: number) {
    return { id: primaryActorId * 10, primary_actor_type: 'Conversation', primary_actor_id: primaryActorId };
}

function trayData(overrides: TrayNotificationData = {}): TrayNotificationData {
    return { account_id: ACCOUNT_ID, notification_id: 1, primary_actor_type: 'Conversation', primary_actor_id: 77, ...overrides };
}

function closePredicates(): TrayPredicate[] {
    return tray.closeTrayNotifications.mock.calls.map(([predicate]) => predicate as TrayPredicate);
}

function lastClosePredicate(): TrayPredicate {
    const predicates = closePredicates();
    return predicates[predicates.length - 1];
}

async function flushPromises() {
    for (let step = 0; step < 5; step += 1) await Promise.resolve();
}

function emitNotification(eventName: string, notification: Record<string, unknown>, unreadCount = 1, accountId = ACCOUNT_ID) {
    emitter.emit(eventName, { notification, unread_count: unreadCount, count: 5, account_id: accountId });
}

async function bindLoaded(unreadCount: number) {
    api.fetchUnreadCount.mockResolvedValue(unreadCount);
    bindUnreadIndicators(ACCOUNT_ID);
    await flushPromises();
}

describe('chỉ báo chưa đọc ngoài app', () => {
    beforeEach(async () => {
        await clearUnreadIndicators();
        vi.clearAllMocks();
        api.fetchNotifications.mockResolvedValue({ payload: [], meta: { count: 0, currentPage: 1 } });
    });

    afterEach(async () => {
        await clearUnreadIndicators();
    });

    it('số đã nạp thì đổi tiêu đề tab và badge; về 0 thì đóng thông báo của đúng account', async () => {
        api.fetchNotifications.mockResolvedValue({ payload: [unreadNotification(77)], meta: { count: 1, currentPage: 1 } });
        await bindLoaded(3);

        expect(tray.applyUnreadTitle).toHaveBeenLastCalledWith(3);
        expect(tray.setAppBadgeCount).toHaveBeenLastCalledWith(3);
        tray.closeTrayNotifications.mockClear();

        emitNotification('notification.updated', { id: 1, read_at: null }, 0);

        expect(tray.applyUnreadTitle).toHaveBeenLastCalledWith(0);
        expect(tray.setAppBadgeCount).toHaveBeenLastCalledWith(0);
        const closeAccount = closePredicates()[0];
        expect(closeAccount(trayData())).toBe(true);
        expect(closeAccount(trayData({ account_id: 9 }))).toBe(false);
    });

    it('Dashboard dựng lại khi đổi trang thì áp lại tiêu đề và badge, không đóng khay lần nữa', async () => {
        await bindLoaded(0);
        vi.clearAllMocks();

        bindUnreadIndicators(ACCOUNT_ID);
        await flushPromises();

        expect(tray.applyUnreadTitle).toHaveBeenCalledWith(0);
        expect(tray.setAppBadgeCount).toHaveBeenCalledWith(0);
        expect(tray.closeTrayNotifications).not.toHaveBeenCalled();
        expect(api.fetchUnreadCount).not.toHaveBeenCalled();
    });

    it('chưa nạp xong số thì không đụng tiêu đề và không đóng khay', () => {
        api.fetchUnreadCount.mockReturnValue(new Promise(() => undefined));

        bindUnreadIndicators(ACCOUNT_ID);

        expect(tray.applyUnreadTitle).not.toHaveBeenCalled();
        expect(tray.setAppBadgeCount).not.toHaveBeenCalled();
        expect(tray.closeTrayNotifications).not.toHaveBeenCalled();
    });

    it('thông báo được đọc thì đóng thông báo trong khay của đúng hội thoại', async () => {
        await bindLoaded(2);
        tray.closeTrayNotifications.mockClear();

        emitNotification('notification.updated', {
            id: 1,
            primary_actor_type: 'Conversation',
            primary_actor_id: 77,
            read_at: '2026-09-24T10:00:00Z',
            snoozed_until: null,
        });

        const closeConversation = lastClosePredicate();
        expect(closeConversation(trayData())).toBe(true);
        expect(closeConversation(trayData({ primary_actor_id: 78 }))).toBe(false);
        expect(closeConversation(trayData({ account_id: 9 }))).toBe(false);
    });

    it('đánh dấu chưa đọc thì không đóng gì', async () => {
        await bindLoaded(2);
        tray.closeTrayNotifications.mockClear();

        emitNotification('notification.updated', {
            id: 1,
            primary_actor_type: 'Conversation',
            primary_actor_id: 77,
            read_at: null,
            snoozed_until: null,
        }, 3);

        expect(tray.closeTrayNotifications).not.toHaveBeenCalled();
    });

    it('tạm ẩn thông báo cũng đóng thông báo trong khay', async () => {
        await bindLoaded(2);
        tray.closeTrayNotifications.mockClear();

        emitNotification('notification.updated', {
            id: 1,
            primary_actor_type: 'Conversation',
            primary_actor_id: 77,
            read_at: null,
            snoozed_until: '2026-09-25T09:00:00Z',
        });

        expect(lastClosePredicate()(trayData())).toBe(true);
    });

    it('xoá thông báo thì đóng đúng thông báo đó', async () => {
        await bindLoaded(2);
        tray.closeTrayNotifications.mockClear();

        emitNotification('notification.deleted', { id: 5 });

        const closeDeleted = lastClosePredicate();
        expect(closeDeleted(trayData({ notification_id: 5 }))).toBe(true);
        expect(closeDeleted(trayData({ notification_id: 6 }))).toBe(false);
    });

    it('đối soát khay: đóng hội thoại đã đọc ở nơi khác, giữ hội thoại còn chưa đọc', async () => {
        api.fetchNotifications.mockResolvedValue({
            payload: [unreadNotification(1), unreadNotification(2)],
            meta: { count: 2, currentPage: 1 },
        });

        await bindLoaded(2);

        expect(api.fetchNotifications).toHaveBeenCalledWith({
            accountId: ACCOUNT_ID,
            page: 1,
            status: '',
            type: '',
            sortOrder: 'desc',
        });
        const reconcile = lastClosePredicate();
        expect(reconcile(trayData({ primary_actor_id: 1 }))).toBe(false);
        expect(reconcile(trayData({ primary_actor_id: 2 }))).toBe(false);
        expect(reconcile(trayData({ primary_actor_id: 3 }))).toBe(true);
        expect(reconcile(trayData({ account_id: 9, primary_actor_id: 3 }))).toBe(false);
    });

    it('đối soát một lần mỗi account, chạy lại khi realtime nối lại', async () => {
        await bindLoaded(2);
        bindUnreadIndicators(ACCOUNT_ID);
        await flushPromises();
        expect(api.fetchNotifications).toHaveBeenCalledOnce();

        emitter.emit(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED);
        await flushPromises();

        expect(api.fetchNotifications).toHaveBeenCalledTimes(2);
    });

    it('đối soát lỗi mạng thì bỏ qua', async () => {
        api.fetchNotifications.mockRejectedValue(new Error('offline'));

        await expect(bindLoaded(2)).resolves.toBeUndefined();
    });

    it('đổi trang thì áp lại số lên tiêu đề tab', async () => {
        await bindLoaded(4);
        tray.applyUnreadTitle.mockClear();

        navigateListeners.forEach(listener => listener());

        expect(tray.applyUnreadTitle).toHaveBeenCalledWith(4);
    });

    it('đăng xuất: bỏ số ở tiêu đề, xoá badge, đóng mọi thông báo trong khay, thôi nghe event', async () => {
        await bindLoaded(4);
        vi.clearAllMocks();

        await clearUnreadIndicators();

        expect(tray.applyUnreadTitle).toHaveBeenCalledWith(0);
        expect(tray.setAppBadgeCount).toHaveBeenCalledWith(0);
        const closeEverything = lastClosePredicate();
        expect(closeEverything(trayData({ account_id: 9 }))).toBe(true);
        expect(closeEverything({})).toBe(true);
        expect(navigateListeners.size).toBe(0);

        vi.clearAllMocks();
        emitNotification('notification.deleted', { id: 5 }, 0);
        expect(tray.closeTrayNotifications).not.toHaveBeenCalled();
    });
});
