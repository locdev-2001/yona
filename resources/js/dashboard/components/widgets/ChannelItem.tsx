import ChannelSelector from '../ChannelSelector';

// Thẻ một lối vào ở màn "Thêm kênh". Lối nào đóng thì backend đã không gửi xuống
// (ChannelConnectionCatalog), nên thẻ ở đây luôn bấm được.
export interface ChannelOption {
    key: string;
    title: string;
    description: string;
    icon: string;
    logoUrl: string | null;
}

interface ChannelItemProps {
    channel: ChannelOption;
    onChannelItemClick: (key: string) => void;
}

export default function ChannelItem({ channel, onChannelItemClick }: ChannelItemProps) {
    return (
        <ChannelSelector
            title={channel.title}
            description={channel.description}
            icon={channel.icon}
            logoUrl={channel.logoUrl}
            onClick={() => onChannelItemClick(channel.key)}
        />
    );
}
