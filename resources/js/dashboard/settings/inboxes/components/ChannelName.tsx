import { getInboxLabelKeyByType, INBOX_TYPES } from 'dashboard/helper/inbox';
import { t } from '../../../../i18n';

// Port từ settings/inbox/components/ChannelName.vue (apiChannelName của
// globalConfig chưa dùng — bản cài đặt không đặt tên riêng cho kênh API).
// Bản đồ `channel_type` → nhãn nằm ở helper/inbox.ts cùng chỗ với icon kênh;
// kênh chưa khai báo hiện chính tên loại thay vì rơi về "Kênh API".
interface ChannelNameProps {
    channelType: string;
    medium?: string | null;
    className?: string;
}

function labelKeyFor(channelType: string, medium: string): string | null {
    if (channelType === INBOX_TYPES.TWILIO && medium === 'whatsapp') return 'WHATSAPP';

    return getInboxLabelKeyByType(channelType);
}

export default function ChannelName({ channelType, medium = '', className = '' }: ChannelNameProps) {
    const labelKey = labelKeyFor(channelType, medium ?? '');

    return (
        <span className={className}>
            {labelKey ? t(`INBOX_MGMT.CHANNELS.${labelKey}`) : channelType.replace('Channel::', '')}
        </span>
    );
}
