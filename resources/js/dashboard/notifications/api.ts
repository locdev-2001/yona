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
    // Bộ lọc kênh: bỏ trống = mọi kênh.
    inboxIds?: number[];
}

function appendInboxIds(query: URLSearchParams, inboxIds?: number[]): void {
    inboxIds?.forEach(inboxId => query.append('inbox_ids[]', String(inboxId)));
}

function inboxIdsBody(inboxIds?: number[]): { inbox_ids?: number[] } {
    return inboxIds?.length ? { inbox_ids: inboxIds } : {};
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
    inboxIds,
}: FetchNotificationsParams): Promise<{ payload: NotificationRecord[]; meta: NotificationsMeta }> {
    const query = new URLSearchParams({ page: String(page), sort_order: sortOrder });
    // `includes` gộp hai bộ lọc hiển thị (snoozed / read) như bản gốc.
    [status, type].filter(Boolean).forEach(value => query.append('includes[]', value));
    appendInboxIds(query, inboxIds);

    const response = await getJson<NotificationsResponse>(`${notificationsUrl(accountId)}?${query.toString()}`);

    return {
        payload: response.data.payload,
        meta: {
            count: response.data.meta.count,
            currentPage: response.data.meta.current_page,
        },
    };
}

export interface UnreadCountsPayload {
    unread_count: number;
    unread_inbox_counts: Record<string, number>;
}

export function fetchUnreadCounts(accountId: number): Promise<UnreadCountsPayload> {
    return getJson<UnreadCountsPayload>(`${notificationsUrl(accountId)}/unread_counts`);
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

// Không có kênh nào = mọi kênh của account.
export function markInboxNotificationsRead(accountId: number, inboxIds?: number[]): Promise<unknown> {
    return postJson(`${notificationsUrl(accountId)}/read_all`, inboxIdsBody(inboxIds));
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

export function deleteNotifications(accountId: number, type: 'all' | 'read', inboxIds?: number[]): Promise<unknown> {
    return postJson(`${notificationsUrl(accountId)}/destroy_all`, { type, ...inboxIdsBody(inboxIds) });
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
