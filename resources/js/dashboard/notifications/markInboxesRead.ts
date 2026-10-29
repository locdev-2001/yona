import { BUS_EVENTS, emitter } from 'shared/helpers/emitter';
import { markInboxNotificationsRead } from './api';
import { scheduleUnreadCountRefresh } from './useUnreadCount';

// Payload BUS_EVENTS.CONVERSATIONS_ALL_SEEN: không có inboxIds = mọi kênh.
export interface ConversationsAllSeenPayload {
    inboxIds?: number[];
}

// Đường DUY NHẤT của "đánh dấu đã đọc" theo bộ lọc kênh (chuông, menu kênh ở sidebar):
// máy chủ đánh dấu thông báo + hội thoại, danh sách tắt chấm, chuông và badge kênh hỏi lại số.
export async function markInboxesRead(accountId: number, inboxIds?: number[]): Promise<void> {
    const scopedInboxIds = inboxIds?.length ? inboxIds : undefined;
    await markInboxNotificationsRead(accountId, scopedInboxIds);
    emitter.emit(BUS_EVENTS.CONVERSATIONS_ALL_SEEN, { inboxIds: scopedInboxIds } satisfies ConversationsAllSeenPayload);
    scheduleUnreadCountRefresh();
}

export function isInInboxes(inboxId: number | undefined, inboxIds?: number[]): boolean {
    return !inboxIds?.length || (inboxId !== undefined && inboxIds.includes(inboxId));
}
