import Icon from 'dashboard/components-next/icon/Icon';
import PlatformLogo from 'dashboard/components-next/icon/PlatformLogo';
import { getInboxIconByType } from 'dashboard/helper/inbox';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';

// Hộp thư mang `platform` (kênh tự khai) thì vẽ logo màu của nền tảng. Payload
// chỉ có `channel_type` (danh mục chọn loại kênh, tìm kiếm, thông báo…) lùi về
// bảng icon đơn sắc ở `helper/inbox.ts`.
const UNKNOWN_CHANNEL_ICON = 'i-ri-global-fill';

export interface ChannelIconInbox {
    channel_type: string;
    name?: string;
    platform?: ChannelPlatform | null;
}

interface ChannelIconProps {
    inbox: ChannelIconInbox;
    className?: string;
}

export default function ChannelIcon({ inbox, className = '' }: ChannelIconProps) {
    if (inbox.platform) {
        return (
            <span className={`inline-flex ${className}`} title={inbox.name}>
                <PlatformLogo platform={inbox.platform} className="size-full" />
            </span>
        );
    }

    const icon = getInboxIconByType(inbox.channel_type, 'line', UNKNOWN_CHANNEL_ICON);

    return (
        <span className={`inline-flex ${className}`} title={inbox.name}>
            <Icon icon={icon} className="size-full" />
        </span>
    );
}
