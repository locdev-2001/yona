import { deleteJson, getJson, patchJson, postJson } from 'dashboard/helper/apiClient';
import type { NotificationRecord, NotificationsMeta } from './types';

// Port từ dashboard/api/notifications.js.

interface NotificationsResponse {
    data: {
        meta: { count: number; current_page: number; unread_count: number };
        payload: NotificationRecord[];
    };
}

export interface FetchNotificationsParams {
    accountId: number;
    page: number;
    status: string;
    type: string;
    sortOrder: string;
}

function notificationsUrl(accountId: number): string {
    return `/api/v1/accounts/${accountId}/notifications`;
}

export async function fetchNotifications({
    accountId,
    page,
    status,
    type,
    sortOrder,
}: FetchNotificationsParams): Promise<{ payload: NotificationRecord[]; meta: NotificationsMeta }> {
    const query = new URLSearchParams({ page: String(page), sort_order: sortOrder });
    // `includes` gộp hai bộ lọc hiển thị (snoozed / read) như bản gốc.
    [status, type].filter(Boolean).forEach(value => query.append('includes[]', value));

    const response = await getJson<NotificationsResponse>(`${notificationsUrl(accountId)}?${query.toString()}`);

    return {
        payload: response.data.payload,
        meta: {
            count: response.data.meta.count,
            currentPage: response.data.meta.current_page,
        },
    };
}

export function fetchUnreadCount(accountId: number): Promise<number> {
    return getJson<number>(`${notificationsUrl(accountId)}/unread_count`);
}

export function markNotificationsRead(
    accountId: number,
    primaryActorType?: string,
    primaryActorId?: number,
): Promise<unknown> {
    return postJson(`${notificationsUrl(accountId)}/read_all`, {
        primary_actor_type: primaryActorType,
        primary_actor_id: primaryActorId,
    });
}

export function markNotificationUnread(accountId: number, notificationId: number): Promise<NotificationRecord> {
    return postJson<NotificationRecord>(`${notificationsUrl(accountId)}/${notificationId}/unread`, {});
}

export function markNotificationRead(accountId: number, notificationId: number): Promise<NotificationRecord> {
    return patchJson<NotificationRecord>(`${notificationsUrl(accountId)}/${notificationId}`, {});
}

export function deleteNotification(accountId: number, notificationId: number): Promise<unknown> {
    return deleteJson(`${notificationsUrl(accountId)}/${notificationId}`);
}

export function deleteNotifications(accountId: number, type: 'all' | 'read'): Promise<unknown> {
    return postJson(`${notificationsUrl(accountId)}/destroy_all`, { type });
}

export function snoozeNotification(
    accountId: number,
    notificationId: number,
    snoozedUntil: number | null,
): Promise<NotificationRecord> {
    return postJson<NotificationRecord>(`${notificationsUrl(accountId)}/${notificationId}/snooze`, {
        snoozed_until: snoozedUntil,
    });
}

export interface NotificationSettings {
    id: number;
    user_id: number;
    account_id: number;
    all_email_flags: string[];
    selected_email_flags: string[];
    all_push_flags: string[];
    selected_push_flags: string[];
}

export function fetchNotificationSettings(accountId: number): Promise<NotificationSettings> {
    return getJson<NotificationSettings>(`/api/v1/accounts/${accountId}/notification_settings`);
}

export function updateNotificationSettings(
    accountId: number,
    selectedEmailFlags: string[],
    selectedPushFlags: string[],
): Promise<NotificationSettings> {
    return patchJson<NotificationSettings>(`/api/v1/accounts/${accountId}/notification_settings`, {
        notification_settings: {
            selected_email_flags: selectedEmailFlags,
            selected_push_flags: selectedPushFlags,
        },
    });
}
