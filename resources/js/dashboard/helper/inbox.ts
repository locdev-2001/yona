// Port từ dashboard/helper/inbox.js @ v4.17.1 (phần dùng cho B1 — voice/twilio
// helpers + getInboxSource/getReadableInboxByType port cùng kênh của chúng).
export const INBOX_TYPES = {
    WEB: 'Channel::WebWidget',
    FB: 'Channel::FacebookPage',
    TWITTER: 'Channel::TwitterProfile',
    TWILIO: 'Channel::TwilioSms',
    WHATSAPP: 'Channel::Whatsapp',
    API: 'Channel::Api',
    EMAIL: 'Channel::Email',
    TELEGRAM: 'Channel::Telegram',
    LINE: 'Channel::Line',
    SMS: 'Channel::Sms',
    INSTAGRAM: 'Channel::Instagram',
    TIKTOK: 'Channel::Tiktok',
    ZALO: 'Channel::Zalo',
} as const;

const INBOX_ICON_MAP_LINE: Record<string, string> = {
    [INBOX_TYPES.WEB]: 'i-woot-website',
    [INBOX_TYPES.FB]: 'i-woot-messenger',
    [INBOX_TYPES.TWITTER]: 'i-woot-x',
    [INBOX_TYPES.WHATSAPP]: 'i-woot-whatsapp',
    [INBOX_TYPES.API]: 'i-woot-api',
    [INBOX_TYPES.EMAIL]: 'i-woot-mail',
    [INBOX_TYPES.TELEGRAM]: 'i-woot-telegram',
    [INBOX_TYPES.LINE]: 'i-woot-line',
    [INBOX_TYPES.INSTAGRAM]: 'i-woot-instagram',
    [INBOX_TYPES.TIKTOK]: 'i-woot-tiktok',
    [INBOX_TYPES.ZALO]: 'i-woot-zalo',
    [INBOX_TYPES.SMS]: 'i-woot-sms',
    [INBOX_TYPES.TWILIO]: 'i-woot-sms',
};

const DEFAULT_ICON_LINE = 'i-ri-chat-1-line';

// Biến thể `fill` của bản gốc — thẻ campaign dùng bộ này.
const INBOX_ICON_MAP_FILL: Record<string, string> = {
    [INBOX_TYPES.WEB]: 'i-ri-global-fill',
    [INBOX_TYPES.FB]: 'i-ri-messenger-fill',
    [INBOX_TYPES.TWITTER]: 'i-ri-twitter-x-fill',
    [INBOX_TYPES.WHATSAPP]: 'i-ri-whatsapp-fill',
    [INBOX_TYPES.API]: 'i-ri-cloudy-fill',
    [INBOX_TYPES.EMAIL]: 'i-ri-mail-fill',
    [INBOX_TYPES.TELEGRAM]: 'i-ri-telegram-fill',
    [INBOX_TYPES.LINE]: 'i-ri-line-fill',
    [INBOX_TYPES.INSTAGRAM]: 'i-ri-instagram-fill',
    [INBOX_TYPES.TIKTOK]: 'i-ri-tiktok-fill',
    [INBOX_TYPES.ZALO]: 'i-woot-zalo',
    [INBOX_TYPES.SMS]: 'i-woot-sms',
    [INBOX_TYPES.TWILIO]: 'i-woot-sms',
};

const DEFAULT_ICON_FILL = 'i-ri-chat-1-fill';

/**
 * NGUỒN DUY NHẤT của icon kênh (card hội thoại, header hội thoại, sidebar Kênh,
 * thẻ campaign, kết quả tìm kiếm). `channel_type` chỉ được dùng để chọn
 * icon/nhãn — cấm gate tính năng theo nó (docs/channel-capabilities.md §3 FE).
 */
export function getInboxIconByType(
    type: string,
    variant: 'line' | 'fill' = 'line',
    fallback?: string,
): string {
    return variant === 'fill'
        ? (INBOX_ICON_MAP_FILL[type] ?? fallback ?? DEFAULT_ICON_FILL)
        : (INBOX_ICON_MAP_LINE[type] ?? fallback ?? DEFAULT_ICON_LINE);
}

// Khóa i18n `INBOX_MGMT.CHANNELS.*` cho từng loại kênh — đi CÙNG bản đồ icon ở
// trên để nhãn và icon không bao giờ lệch nhau. Không có nhánh mặc định: kênh
// chưa khai báo trả về null để nơi gọi tự quyết (bản gốc rơi hết về "API
// Channel", làm inbox Zalo hiện sai là "Kênh API").
const INBOX_LABEL_KEY_MAP: Record<string, string> = {
    [INBOX_TYPES.FB]: 'MESSENGER',
    [INBOX_TYPES.WEB]: 'WEB_WIDGET',
    [INBOX_TYPES.TWITTER]: 'TWITTER_PROFILE',
    [INBOX_TYPES.TWILIO]: 'TWILIO_SMS',
    [INBOX_TYPES.WHATSAPP]: 'WHATSAPP',
    [INBOX_TYPES.SMS]: 'SMS',
    [INBOX_TYPES.EMAIL]: 'EMAIL',
    [INBOX_TYPES.TELEGRAM]: 'TELEGRAM',
    [INBOX_TYPES.LINE]: 'LINE',
    [INBOX_TYPES.API]: 'API',
    [INBOX_TYPES.INSTAGRAM]: 'INSTAGRAM',
    [INBOX_TYPES.TIKTOK]: 'TIKTOK',
    [INBOX_TYPES.ZALO]: 'ZALO',
};

/** NGUỒN DUY NHẤT của nhãn kênh — trả về khóa i18n, hoặc null nếu chưa khai báo. */
export function getInboxLabelKeyByType(type: string): string | null {
    return INBOX_LABEL_KEY_MAP[type] ?? null;
}
