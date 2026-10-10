import type { ConversationMessage } from './types';

// Giờ tin được gửi trên nền tảng: dùng cho thứ tự và hiển thị trong hội thoại.
// `created_at` là giờ Yona nhận, chỉ dùng cho chưa đọc (unreadHelpers). Payload
// cũ chưa có `platform_sent_at` thì hai giờ bằng nhau.
export function messageSentAt(message: Pick<ConversationMessage, 'created_at' | 'platform_sent_at'>): number {
    return message.platform_sent_at ?? message.created_at;
}

export function compareBySentAt(a: ConversationMessage, b: ConversationMessage): number {
    return messageSentAt(a) - messageSentAt(b) || a.id - b.id;
}
