import Icon from 'dashboard/components-next/icon/Icon';
import { getInboxIconByType } from 'dashboard/helper/inbox';
import type { Inbox } from 'dashboard/settings/inboxes/types';

// Port từ components-next/icon/ChannelIcon.vue + provider.js.
// Bảng icon nằm ở `helper/inbox.ts` (nguồn duy nhất) — trước đây file này giữ
// bản sao thứ hai nên kênh mới (Zalo) hiện icon quả cầu ở header/sidebar trong
// khi thẻ hội thoại đã có icon riêng.
const UNKNOWN_CHANNEL_ICON = 'i-ri-global-fill';

interface ChannelIconProps {
    inbox: Pick<Inbox, 'channel_type'> & { name?: string };
    className?: string;
}

export default function ChannelIcon({ inbox, className = '' }: ChannelIconProps) {
    const icon = getInboxIconByType(inbox.channel_type, 'line', UNKNOWN_CHANNEL_ICON);

    return (
        <span className={`inline-flex ${className}`} title={inbox.name}>
            <Icon icon={icon} className="size-full" />
        </span>
    );
}
