import Icon from 'dashboard/components-next/icon/Icon';
import type { Inbox } from 'dashboard/settings/inboxes/types';

// Port từ components-next/icon/ChannelIcon.vue + provider.js (nhánh dùng ở B1;
// brand icon + provider email/twilio đặc thù vào cùng kênh của chúng).
const CHANNEL_TYPE_ICON_MAP: Record<string, string> = {
    'Channel::Api': 'i-woot-api',
    'Channel::Email': 'i-woot-mail',
    'Channel::FacebookPage': 'i-woot-messenger',
    'Channel::Line': 'i-woot-line',
    'Channel::Sms': 'i-woot-sms',
    'Channel::Telegram': 'i-woot-telegram',
    'Channel::TwilioSms': 'i-woot-sms',
    'Channel::TwitterProfile': 'i-woot-x',
    'Channel::WebWidget': 'i-woot-website',
    'Channel::Whatsapp': 'i-woot-whatsapp',
    'Channel::Instagram': 'i-woot-instagram',
    'Channel::Tiktok': 'i-woot-tiktok',
};

interface ChannelIconProps {
    inbox: Pick<Inbox, 'channel_type'>;
    className?: string;
}

export default function ChannelIcon({ inbox, className = '' }: ChannelIconProps) {
    const icon = CHANNEL_TYPE_ICON_MAP[inbox.channel_type] ?? 'i-ri-global-fill';

    return (
        <span className={`inline-flex ${className}`}>
            <Icon icon={icon} className="size-full" />
        </span>
    );
}
