import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import type { ChannelIconInbox } from 'dashboard/components-next/icon/ChannelIcon';
import { useChannelDisplayName } from 'dashboard/components-next/sidebar/useChannelPreferences';

// Port từ dashboard/components/widgets/InboxName.vue
interface InboxNameProps {
    inbox: ChannelIconInbox & { id?: number; name: string };
    className?: string;
}

// Hiện biệt danh người dùng đặt cho kênh; rê chuột thấy tên kênh thật.
export default function InboxName({ inbox, className = '' }: InboxNameProps) {
    const displayName = useChannelDisplayName(inbox.id, inbox.name);

    return (
        <div title={inbox.name} className={`flex items-center gap-1 min-w-0 ${className}`.trim()}>
            <ChannelIcon inbox={inbox} className="size-3 flex-shrink-0 text-n-slate-11" />
            <span className="truncate text-label-small text-n-slate-11">{displayName}</span>
        </div>
    );
}
