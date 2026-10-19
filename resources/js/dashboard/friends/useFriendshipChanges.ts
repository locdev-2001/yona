import { useRealtimeEvent } from 'dashboard/realtime/hooks';

const FRIENDSHIP_ACTOR_TYPE = 'Friendship';
const NOTIFICATION_EVENTS = ['notification.created', 'notification.updated', 'notification.deleted'] as const;

interface NotificationEventPayload {
    notification?: { primary_actor_type?: string };
}

// Lời mời kết bạn tới, được chấp nhận hay bị huỷ đều đi kèm một thông báo: nghe thông
// báo về Friendship để danh sách lời mời và hồ sơ cập nhật mà không cần tải lại trang.
// notification.deleted chỉ mang id nên luôn báo đổi.
export function useFriendshipChanges(onChange: () => void): void {
    const handle = (payload: NotificationEventPayload) => {
        const actorType = payload?.notification?.primary_actor_type;
        if (actorType === undefined || actorType === FRIENDSHIP_ACTOR_TYPE) onChange();
    };

    useRealtimeEvent<NotificationEventPayload>(NOTIFICATION_EVENTS[0], handle);
    useRealtimeEvent<NotificationEventPayload>(NOTIFICATION_EVENTS[1], handle);
    useRealtimeEvent<NotificationEventPayload>(NOTIFICATION_EVENTS[2], handle);
}
