import { SERVICE_WORKER_URL } from './pushHelper';

// Chỗ duy nhất chạm API trình duyệt cho chỉ báo chưa đọc ngoài app: thông báo
// trong khay hệ điều hành, số trên biểu tượng app đã cài, tiền tố số ở tiêu đề
// tab. Trình duyệt thiếu API hoặc từ chối thì bỏ qua, không bao giờ ném.

// Trường `data` mà public/sw.js gắn vào thông báo, lấy từ payload đẩy của máy chủ.
export interface TrayNotificationData {
    url?: string;
    account_id?: number;
    notification_id?: number;
    primary_actor_type?: string;
    primary_actor_id?: number;
}

const UNREAD_TITLE_PREFIX = /^\(\d+\+?\)\s/;
const MAX_DISPLAYED_UNREAD_COUNT = 99;

// Một cách viết số chưa đọc cho mọi chỉ báo (chuông, tiêu đề tab).
export function formatUnreadCount(count: number): string {
    return count > MAX_DISPLAYED_UNREAD_COUNT ? `${MAX_DISPLAYED_UNREAD_COUNT}+` : String(count);
}

// Chỉ đọc service worker đã đăng ký, không đăng ký mới chỉ để đóng thông báo.
export async function closeTrayNotifications(shouldClose: (data: TrayNotificationData) => boolean): Promise<void> {
    try {
        if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

        const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
        if (!registration || typeof registration.getNotifications !== 'function') return;

        const notifications = await registration.getNotifications();
        notifications.forEach(notification => {
            if (shouldClose((notification.data ?? {}) as TrayNotificationData)) notification.close();
        });
    } catch {
        // Khay chỉ là lối tắt: không đóng được thì số trong app vẫn đúng.
    }
}

export async function setAppBadgeCount(count: number): Promise<void> {
    try {
        if (typeof navigator === 'undefined') return;

        if (count > 0) {
            if ('setAppBadge' in navigator) await navigator.setAppBadge(count);
        } else if ('clearAppBadge' in navigator) {
            await navigator.clearAppBadge();
        }
    } catch {
        // Tab thường (chưa cài app) hoặc người dùng chặn badge.
    }
}

export function formatUnreadTitle(title: string, count: number): string {
    const baseTitle = title.replace(UNREAD_TITLE_PREFIX, '');
    if (count <= 0) return baseTitle;

    return `(${formatUnreadCount(count)}) ${baseTitle}`;
}

export function applyUnreadTitle(count: number): void {
    if (typeof document === 'undefined') return;

    const nextTitle = formatUnreadTitle(document.title, count);
    if (nextTitle !== document.title) document.title = nextTitle;
}
