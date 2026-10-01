import { BRAND_ICONS, ICONS } from 'dashboard/icons';
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
    [INBOX_TYPES.WEB]: ICONS.channelWebsite,
    [INBOX_TYPES.FB]: 'i-yona-messenger',
    [INBOX_TYPES.TWITTER]: 'i-yona-x',
    [INBOX_TYPES.WHATSAPP]: 'i-yona-whatsapp',
    [INBOX_TYPES.API]: ICONS.channelApi,
    [INBOX_TYPES.EMAIL]: ICONS.channelEmail,
    [INBOX_TYPES.TELEGRAM]: 'i-yona-telegram',
    [INBOX_TYPES.LINE]: 'i-yona-line',
    [INBOX_TYPES.INSTAGRAM]: 'i-yona-instagram',
    [INBOX_TYPES.TIKTOK]: 'i-yona-tiktok',
    [INBOX_TYPES.ZALO]: 'i-yona-zalo',
    [INBOX_TYPES.SMS]: ICONS.channelSms,
    [INBOX_TYPES.TWILIO]: ICONS.channelSms,
};

const DEFAULT_ICON_LINE = ICONS.channelDefault;

// Biến thể `fill` của bản gốc — thẻ campaign dùng bộ này.
const INBOX_ICON_MAP_FILL: Record<string, string> = {
    [INBOX_TYPES.WEB]: ICONS.channelWebsite,
    [INBOX_TYPES.FB]: BRAND_ICONS.messenger,
    [INBOX_TYPES.TWITTER]: BRAND_ICONS.x,
    [INBOX_TYPES.WHATSAPP]: BRAND_ICONS.whatsapp,
    [INBOX_TYPES.API]: ICONS.channelApiFill,
    [INBOX_TYPES.EMAIL]: ICONS.channelEmail,
    [INBOX_TYPES.TELEGRAM]: BRAND_ICONS.telegram,
    [INBOX_TYPES.LINE]: BRAND_ICONS.line,
    [INBOX_TYPES.INSTAGRAM]: BRAND_ICONS.instagram,
    [INBOX_TYPES.TIKTOK]: BRAND_ICONS.tiktok,
    [INBOX_TYPES.ZALO]: 'i-yona-zalo',
    [INBOX_TYPES.SMS]: ICONS.channelSms,
    [INBOX_TYPES.TWILIO]: ICONS.channelSms,
};

const DEFAULT_ICON_FILL = ICONS.channelDefault;

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
