import { t } from '../../../../i18n';

// Port từ settings/inbox/components/ChannelName.vue (apiChannelName của
// globalConfig chưa dùng — bản cài đặt không đặt tên riêng cho kênh API).
const I18N_MAP: Record<string, string> = {
    'Channel::FacebookPage': 'MESSENGER',
    'Channel::WebWidget': 'WEB_WIDGET',
    'Channel::TwitterProfile': 'TWITTER_PROFILE',
    'Channel::TwilioSms': 'TWILIO_SMS',
    'Channel::Whatsapp': 'WHATSAPP',
    'Channel::Sms': 'SMS',
    'Channel::Email': 'EMAIL',
    'Channel::Telegram': 'TELEGRAM',
    'Channel::Line': 'LINE',
    'Channel::Api': 'API',
    'Channel::Instagram': 'INSTAGRAM',
    'Channel::Tiktok': 'TIKTOK',
};

interface ChannelNameProps {
    channelType: string;
    className?: string;
}

export default function ChannelName({ channelType, className = '' }: ChannelNameProps) {
    return <span className={className}>{t(`INBOX_MGMT.CHANNELS.${I18N_MAP[channelType] ?? 'API'}`)}</span>;
}
