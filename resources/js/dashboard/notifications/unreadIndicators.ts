import { router } from '@inertiajs/react';

import { applyUnreadTitle, closeTrayNotifications, setAppBadgeCount } from 'dashboard/helper/notificationTray';
import type { TrayNotificationData } from 'dashboard/helper/notificationTray';
import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import { fetchNotifications } from './api';
import type { NotificationRealtimePayload } from './types';
import { bindUnreadCount, getUnreadCountState, resetUnreadCount, subscribeUnreadCount } from './useUnreadCount';

// Chỉ báo chưa đọc ngoài app (tiêu đề tab, badge biểu tượng app, thông báo trong
// khay hệ điều hành) đi theo store số chưa đọc. Đây là nơi quyết định khi nào đổi
// và đóng; chạm trình duyệt thì qua helper/notificationTray.

type IndicatorPayload = Partial<NotificationRealtimePayload> & {
    notification?: { id?: number; primary_actor_type?: string; primary_actor_id?: number; read_at?: string | null; snoozed_until?: string | null };
};

const actorKey = (type: unknown, id: unknown) => `${String(type)}:${String(id)}`;

let detachIndicators: (() => void) | null = null;
// Mỗi (lượt tải trang, account) đối soát khay một lần; tải lại trang là lượt mới.
const reconciledAccountIds = new Set<number>();

// Thiết bị vừa mở lại Yona không nhận được event "đã đọc" lúc đóng tab: so khay
// với các thông báo còn chưa đọc (trang 1) và đóng phần đã được đọc ở nơi khác.
async function reconcileTray(accountId: number): Promise<void> {
    try {
        const { payload } = await fetchNotifications({ accountId, page: 1, status: '', type: '', sortOrder: 'desc' });
        const unreadActorKeys = new Set(payload.map(item => actorKey(item.primary_actor_type, item.primary_actor_id)));

        await closeTrayNotifications(
            (data: TrayNotificationData) =>
                data.account_id === accountId && !unreadActorKeys.has(actorKey(data.primary_actor_type, data.primary_actor_id)),
        );
    } catch {
        // Mạng lỗi: để lần đối soát sau.
    }
}

function applyTitleAndBadge(): void {
    const { count, isLoaded } = getUnreadCountState();
    if (!isLoaded) return;

    applyUnreadTitle(count);
    void setAppBadgeCount(count);
}

function onUnreadCountChange(): void {
    const { accountId, count, isLoaded } = getUnreadCountState();
    // Trước khi nạp xong số vẫn là 0 mặc định: đóng khay lúc này là đóng nhầm cả.
    if (!isLoaded) return;

    applyTitleAndBadge();

    if (count === 0) {
        void closeTrayNotifications(data => data.account_id === accountId);
    }

    if (!reconciledAccountIds.has(accountId)) {
        reconciledAccountIds.add(accountId);
        void reconcileTray(accountId);
    }
}

function closeReadConversation(payload: unknown): void {
    const { account_id: accountId, notification } = (payload ?? {}) as IndicatorPayload;
    if (!notification || (!notification.read_at && !notification.snoozed_until)) return;

    void closeTrayNotifications(
        data =>
            data.account_id === accountId &&
            data.primary_actor_type === notification.primary_actor_type &&
            data.primary_actor_id === notification.primary_actor_id,
    );
}

function closeDeletedNotification(payload: unknown): void {
    const deletedId = ((payload ?? {}) as IndicatorPayload).notification?.id;
    if (!deletedId) return;

    void closeTrayNotifications(data => data.notification_id === deletedId);
}

function reconcileAfterReconnect(): void {
    const { accountId, isLoaded } = getUnreadCountState();
    if (isLoaded) void reconcileTray(accountId);
}

function attachIndicatorsOnce(): void {
    if (detachIndicators) return;

    const unsubscribeCount = subscribeUnreadCount(onUnreadCountChange);
    // Head manager của Inertia có thể đặt lại <title> khi đổi trang.
    const unsubscribeNavigate = router.on('navigate', applyTitleAndBadge);
    emitter.on('notification.updated', closeReadConversation);
    emitter.on('notification.deleted', closeDeletedNotification);
    emitter.on(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED, reconcileAfterReconnect);

    detachIndicators = () => {
        unsubscribeCount();
        unsubscribeNavigate();
        emitter.off('notification.updated', closeReadConversation);
        emitter.off('notification.deleted', closeDeletedNotification);
        emitter.off(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED, reconcileAfterReconnect);
    };
}

export function bindUnreadIndicators(accountId: number): void {
    if (!accountId) return;
    attachIndicatorsOnce();
    bindUnreadCount(accountId);
    applyTitleAndBadge();
}

// Đăng xuất trên máy dùng chung: thông báo trong khay có trích tin khách.
export async function clearUnreadIndicators(): Promise<void> {
    detachIndicators?.();
    detachIndicators = null;
    reconciledAccountIds.clear();
    resetUnreadCount();

    applyUnreadTitle(0);
    await Promise.all([setAppBadgeCount(0), closeTrayNotifications(() => true)]);
}
