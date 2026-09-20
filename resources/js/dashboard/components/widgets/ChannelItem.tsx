import ChannelSelector from '../ChannelSelector';

// Port từ dashboard/components/widgets/ChannelItem.vue.
// Đã có driver API (B1) và Website (C1); kênh khác giữ nguyên card
// (mờ/disabled) — port kênh nào thì mở kênh đó (channel_website… theo features).
export interface ChannelOption {
    key: string;
    title: string;
    description: string;
    icon: string;
}

const ACTIVE_CHANNELS = ['api', 'website', 'email', 'zalo', 'whatsapp', 'sms', 'telegram', 'line'];
// Kênh chưa mở phải nói rõ là chưa mở — card xám không nhãn khiến người dùng
// tưởng hỏng. Meta (facebook/instagram/whatsapp_call) còn chờ App Review.
const COMING_SOON_CHANNELS = ['voice', 'facebook', 'instagram', 'whatsapp_call'];
const BETA_CHANNELS = ['tiktok', 'voice', 'whatsapp_call'];

interface ChannelItemProps {
    channel: ChannelOption;
    onChannelItemClick: (key: string) => void;
}

export default function ChannelItem({ channel, onChannelItemClick }: ChannelItemProps) {
    const isActive = ACTIVE_CHANNELS.includes(channel.key);
    const isComingSoon = COMING_SOON_CHANNELS.includes(channel.key) && !isActive;

    return (
        <ChannelSelector
            title={channel.title}
            description={channel.description}
            icon={channel.icon}
            isComingSoon={isComingSoon}
            isBeta={BETA_CHANNELS.includes(channel.key)}
            disabled={!isActive}
            onClick={() => {
                if (isActive) onChannelItemClick(channel.key);
            }}
        />
    );
}
