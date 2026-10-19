import type { Conversation, ConversationMessage } from 'dashboard/conversation/types';

// Port từ payload api/v1/accounts/notifications/index.json.jbuilder.
export type NotificationType =
    | 'conversation_creation'
    | 'conversation_assignment'
    | 'assigned_conversation_new_message'
    | 'conversation_mention'
    | 'participating_conversation_new_message'
    | 'sla_missed_first_response'
    | 'sla_missed_next_response'
    | 'sla_missed_resolution'
    | 'friend_request'
    | 'friend_request_accepted';

export interface NotificationRecord {
    id: number;
    notification_type: NotificationType;
    push_message_title: string;
    push_message_body: string;
    primary_actor_type: string;
    primary_actor_id: number;
    // Thông báo kết bạn (primary_actor_type 'Friendship') chỉ mang id và meta.sender.
    primary_actor: Conversation | null;
    read_at: string | null;
    secondary_actor: ConversationMessage | null;
    user: { id: number; name: string; thumbnail?: string } | null;
    created_at: number;
    last_activity_at: number;
    snoozed_until: string | null;
    meta: { last_snoozed_at?: string | null } | null;
}

// Số chưa đọc không nằm ở đây: nguồn duy nhất là store useUnreadCount.
export interface NotificationsMeta {
    count: number;
    currentPage: number;
}

export interface NotificationFilters {
    page: number;
    status: string;
    type: string;
    sortOrder: 'desc' | 'asc';
}

// Payload realtime notification.created / notification.updated / notification.deleted.
export interface NotificationRealtimePayload {
    notification: NotificationRecord | { id: number };
    unread_count: number;
    unread_inbox_counts?: Record<string, number>;
    count: number;
    account_id: number;
}
