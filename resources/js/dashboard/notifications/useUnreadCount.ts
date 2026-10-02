import { useSyncExternalStore } from 'react';

import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import type { ConversationSeenPayload } from 'dashboard/conversation/conversationSeen';
import { fetchUnreadCount } from './api';
import type { NotificationRealtimePayload, NotificationRecord } from './types';

// Nguồn DUY NHẤT phía giao diện cho số trên chuông của account đang mở — số hội
// thoại cần để mắt (có tin chưa đọc hoặc còn thông báo, máy chủ đếm mỗi hội thoại một lần):
// chuông, chấm trên nút menu điện thoại, tiêu đề tab, badge biểu tượng app và việc
// dọn khay thông báo đều đọc ở đây. Sống ở module vì Dashboard dựng lại mỗi lần
// Inertia đổi trang; state trong component sẽ mất và phải nạp lại.

export interface UnreadCountState {
    accountId: number;
    count: number;
    isLoaded: boolean;
}

// Event realtime có thể tới lệch thứ tự; hỏi lại máy chủ một lần sau loạt event để chốt số cuối.
export const UNREAD_COUNT_REFRESH_DELAY_MS = 800;
// Tối đa chờ event "đã đọc" của hội thoại đang mở; quá hạn thì hỏi máy chủ.
export const VIEWED_CONVERSATION_READ_WAIT_MS = 5000;

const CONVERSATION_ACTOR_TYPE = 'Conversation';

const NOTIFICATION_EVENTS = ['notification.created', 'notification.updated', 'notification.deleted'] as const;
// Hội thoại có tin mới hoặc đổi trạng thái/người nhận làm số trên chuông đổi mà không
// sinh thông báo: hỏi lại máy chủ (gộp loạt event bằng nhịp refresh).
const CONVERSATION_EVENTS = ['message.created', 'conversation.created', 'conversation.status_changed', 'conversation.updated'] as const;
const EMPTY_STATE: UnreadCountState = { accountId: 0, count: 0, isLoaded: false };

let unreadState: UnreadCountState = EMPTY_STATE;
// Tăng mỗi khi có event realtime của account đang mở: kết quả GET bắt đầu trước
// event đó là số cũ, không được ghi đè số mới hơn.
let realtimeVersion = 0;
let fetchingAccountId = 0;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let isRealtimeAttached = false;
// Hội thoại đang mở ở tab này: tin vào đó được đánh dấu đọc ngay khi tới, nên số máy
// chủ gửi kèm trong lúc chờ còn tính thông báo sắp đọc. Giữ nguyên số tới khi event
// "đã đọc" của hội thoại đó về, thay vì nháy lên rồi hạ xuống.
let viewedConversationId = 0;
let viewedReadWaitTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function setUnreadState(nextState: UnreadCountState): void {
    unreadState = nextState;
    listeners.forEach(listener => listener());
}

function isWaitingForViewedRead(): boolean {
    return viewedReadWaitTimer !== undefined;
}

function stopWaitingForViewedRead(): void {
    clearTimeout(viewedReadWaitTimer);
    viewedReadWaitTimer = undefined;
}

function waitForViewedRead(): void {
    stopWaitingForViewedRead();
    viewedReadWaitTimer = setTimeout(() => {
        viewedReadWaitTimer = undefined;
        refreshNow();
    }, VIEWED_CONVERSATION_READ_WAIT_MS);
}

function isAboutViewedConversation(payload: Partial<NotificationRealtimePayload>): boolean {
    const notification = payload.notification as Partial<NotificationRecord> | undefined;
    return (
        viewedConversationId > 0 &&
        notification?.primary_actor_type === CONVERSATION_ACTOR_TYPE &&
        notification.primary_actor?.id === viewedConversationId
    );
}

function refreshNow(): void {
    const { accountId } = unreadState;
    if (!accountId) return;

    const versionAtStart = realtimeVersion;
    fetchingAccountId = accountId;

    fetchUnreadCount(accountId)
        .then(count => {
            if (unreadState.accountId !== accountId || realtimeVersion !== versionAtStart) return;
            if (isWaitingForViewedRead()) return;
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

    if (isAboutViewedConversation(realtimePayload)) {
        const notification = realtimePayload.notification as Partial<NotificationRecord>;
        if (!notification.read_at && !notification.snoozed_until) {
            waitForViewedRead();
            return;
        }
        stopWaitingForViewedRead();
    } else if (isWaitingForViewedRead()) {
        return;
    }

    const nextCount = Number(realtimePayload.unread_count);
    if (Number.isFinite(nextCount)) {
        setUnreadState({ ...unreadState, count: Math.max(0, nextCount), isLoaded: true });
    }
    scheduleUnreadCountRefresh();
}

// Tin vào hội thoại đang mở được đánh dấu đọc ngay, lần đánh dấu đó tự hỏi lại số.
function refreshForConversationEvent(payload: unknown): void {
    const conversationId = (payload as { conversation_id?: number; id?: number } | null)?.conversation_id;
    if (viewedConversationId > 0 && conversationId === viewedConversationId) return;
    scheduleUnreadCountRefresh();
}

function attachRealtimeOnce(): void {
    if (isRealtimeAttached) return;
    isRealtimeAttached = true;
    NOTIFICATION_EVENTS.forEach(eventName => emitter.on(eventName, applyRealtimePayload));
    CONVERSATION_EVENTS.forEach(eventName => emitter.on(eventName, refreshForConversationEvent));
    emitter.on(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED, scheduleUnreadCountRefresh);
    emitter.on(BUS_EVENTS.CONVERSATION_SEEN, applyConversationSeen);
}

function detachRealtime(): void {
    if (!isRealtimeAttached) return;
    isRealtimeAttached = false;
    NOTIFICATION_EVENTS.forEach(eventName => emitter.off(eventName, applyRealtimePayload));
    CONVERSATION_EVENTS.forEach(eventName => emitter.off(eventName, refreshForConversationEvent));
    emitter.off(BUS_EVENTS.WEBSOCKET_RECONNECT_COMPLETED, scheduleUnreadCountRefresh);
    emitter.off(BUS_EVENTS.CONVERSATION_SEEN, applyConversationSeen);
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

// Hội thoại tab này đang mở, theo id hội thoại phía giao diện (0 = không mở hội thoại nào).
export function setViewedConversation(conversationId: number): void {
    viewedConversationId = conversationId;
    if (!conversationId && isWaitingForViewedRead()) {
        stopWaitingForViewedRead();
        scheduleUnreadCountRefresh();
    }
}

// Vừa xem một hội thoại đang có chấm chưa đọc: chuông giảm một ngay, máy chủ chốt số sau.
function applyConversationSeen(payload: unknown): void {
    if (!(payload as Partial<ConversationSeenPayload> | null)?.hadUnread) return;
    if (!unreadState.isLoaded || unreadState.count === 0) return;
    realtimeVersion += 1;
    setUnreadState({ ...unreadState, count: unreadState.count - 1 });
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
    stopWaitingForViewedRead();
    realtimeVersion += 1;
    fetchingAccountId = 0;
    detachRealtime();
    setUnreadState(EMPTY_STATE);
}

const readCount = () => unreadState.count;

export function useNotificationsUnreadCount(): number {
    return useSyncExternalStore(subscribeUnreadCount, readCount, readCount);
}
