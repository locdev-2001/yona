import type { NotificationRecord } from './types';

// Port từ store/modules/notifications/helpers.js + routes/dashboard/inbox/helpers/InboxViewHelpers.js.

export const INBOX_SORT_BY = { NEWEST: 'desc', OLDEST: 'asc' } as const;

export const INBOX_DISPLAY_BY = { SNOOZED: 'snoozed', READ: 'read' } as const;

export const INBOX_FILTER_TYPE = { STATUS: 'status', TYPE: 'type', SORT_ORDER: 'sort_order' } as const;

export const NOTIFICATION_TYPES_MAPPING: Record<string, [string, string]> = {
    CONVERSATION_MENTION: ['i-lucide-at-sign', 'text-n-blue-11'],
    CONVERSATION_ASSIGNMENT: ['i-lucide-chevrons-right', 'text-n-blue-11'],
    CONVERSATION_CREATION: ['i-lucide-mail-plus', 'text-n-blue-11'],
    PARTICIPATING_CONVERSATION_NEW_MESSAGE: ['i-lucide-message-square-plus', 'text-n-blue-11'],
    ASSIGNED_CONVERSATION_NEW_MESSAGE: ['i-lucide-message-square-plus', 'text-n-blue-11'],
    SLA_MISSED_FIRST_RESPONSE: ['i-lucide-heart-crack', 'text-n-ruby-11'],
    SLA_MISSED_NEXT_RESPONSE: ['i-lucide-heart-crack', 'text-n-ruby-11'],
    SLA_MISSED_RESOLUTION: ['i-lucide-heart-crack', 'text-n-ruby-11'],
};

export function sortNotifications(
    notifications: NotificationRecord[],
    sortOrder: string,
): NotificationRecord[] {
    const direction = sortOrder === INBOX_SORT_BY.OLDEST ? 1 : -1;

    return [...notifications].sort((first, second) => (first.created_at - second.created_at) * direction);
}

// SET_NOTIFICATIONS của bản gốc: primary_actor_id là duy nhất, bản mới thay bản cũ.
export function mergeNotifications(
    current: NotificationRecord[],
    incoming: NotificationRecord[],
): NotificationRecord[] {
    const merged = [...current];

    incoming.forEach(notification => {
        const sameActorIndex = merged.findIndex(record => record.primary_actor_id === notification.primary_actor_id);
        if (sameActorIndex !== -1) merged.splice(sameActorIndex, 1);

        const sameIdIndex = merged.findIndex(record => record.id === notification.id);
        if (sameIdIndex !== -1) {
            merged[sameIdIndex] = { ...merged[sameIdIndex], ...notification };
        } else {
            merged.push(notification);
        }
    });

    return merged;
}
