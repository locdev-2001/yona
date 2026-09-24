import { useSyncExternalStore } from 'react';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import { fetchUnreadCount } from './api';
import type { NotificationRealtimePayload } from './types';

// Nguồn DUY NHẤT phía giao diện cho số thông báo chưa đọc của account đang mở:
// chuông, chấm trên nút menu điện thoại, tiêu đề tab, badge biểu tượng app và việc
// dọn khay thông báo đều đọc ở đây. Sống ở module vì Dashboard dựng lại mỗi lần
// Inertia đổi trang; state trong component sẽ mất và phải nạp lại.

export interface UnreadCountState {
    accountId: number;
    count: number;
    isLoaded: boolean;
}

// read_all sinh N event, mỗi event mang số tính lúc phát và có thể tới lệch thứ tự;
// hỏi lại máy chủ một lần sau loạt event để chốt số cuối.
export const UNREAD_COUNT_REFRESH_DELAY_MS = 800;

const NOTIFICATION_EVENTS = ['notification.created', 'notification.updated', 'notification.deleted'] as const;
const EMPTY_STATE: UnreadCountState = { accountId: 0, count: 0, isLoaded: false };

let unreadState: UnreadCountState = EMPTY_STATE;
// Tăng mỗi khi có event realtime của account đang mở: kết quả GET bắt đầu trước
// event đó là số cũ, không được ghi đè số mới hơn.
let realtimeVersion = 0;
let fetchingAccountId = 0;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let isRealtimeAttached = false;
const listeners = new Set<() => void>();

function setUnreadState(nextState: UnreadCountState): void {
    unreadState = nextState;
    listeners.forEach(listener => listener());
}

function refreshNow(): void {
    const { accountId } = unreadState;
    if (!accountId) return;

    const versionAtStart = realtimeVersion;
    fetchingAccountId = accountId;

    fetchUnreadCount(accountId)
        .then(count => {
            if (unreadState.accountId !== accountId || realtimeVersion !== versionAtStart) return;
            const normalizedCount = Number(count);
            if (!Number.isFinite(normalizedCount)) return;
            setUnreadState({ accountId, count: Math.max(0, normalizedCount), isLoaded: true });
        })
        .catch(() => undefined)
        .finally(() => {
            if (fetchingAccountId === accountId) fetchingAccountId = 0;
        });
}

function applyRealtimePayload(payload: unknown): void {
    const realtimePayload = payload as Partial<NotificationRealtimePayload> | null;
    if (!realtimePayload || realtimePayload.account_id !== unreadState.accountId) return;

    realtimeVersion += 1;
    const nextCount = Number(realtimePayload.unread_count);
    if (Number.isFinite(nextCount)) {
        setUnreadState({ ...unreadState, count: Math.max(0, nextCount), isLoaded: true });
    }
    scheduleUnreadCountRefresh();
}

function attachRealtimeOnce(): void {
    if (isRealtimeAttached) return;
    isRealtimeAttached = true;
    NOTIFICATION_EVENTS.forEach(eventName => emitter.on(eventName, applyRealtimePayload));
    emitter.on(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED, scheduleUnreadCountRefresh);
}

function detachRealtime(): void {
    if (!isRealtimeAttached) return;
    isRealtimeAttached = false;
    NOTIFICATION_EVENTS.forEach(eventName => emitter.off(eventName, applyRealtimePayload));
    emitter.off(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED, scheduleUnreadCountRefresh);
}

// Gọi mỗi lần Dashboard dựng: cùng account mà đã có số (hoặc đang hỏi) thì thôi.
export function bindUnreadCount(accountId: number): void {
    if (!accountId) return;
    attachRealtimeOnce();

    if (unreadState.accountId === accountId && (unreadState.isLoaded || fetchingAccountId === accountId)) return;

    clearTimeout(refreshTimer);
    if (unreadState.accountId !== accountId) {
        setUnreadState({ accountId, count: 0, isLoaded: false });
    }
    refreshNow();
}

export function scheduleUnreadCountRefresh(): void {
    if (!unreadState.accountId) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshNow, UNREAD_COUNT_REFRESH_DELAY_MS);
}

export function getUnreadCountState(): UnreadCountState {
    return unreadState;
}

export function subscribeUnreadCount(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

// Đăng xuất: người dùng sau trên cùng máy không được thấy số của người trước.
export function resetUnreadCount(): void {
    clearTimeout(refreshTimer);
    refreshTimer = undefined;
    realtimeVersion += 1;
    fetchingAccountId = 0;
    detachRealtime();
    setUnreadState(EMPTY_STATE);
}

const readCount = () => unreadState.count;

export function useNotificationsUnreadCount(): number {
    return useSyncExternalStore(subscribeUnreadCount, readCount, readCount);
}
