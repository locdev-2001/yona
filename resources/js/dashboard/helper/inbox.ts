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
};

const DEFAULT_ICON_LINE = 'i-ri-chat-1-line';

export function getInboxIconByType(type: string): string {
    return INBOX_ICON_MAP_LINE[type] ?? DEFAULT_ICON_LINE;
}
