import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import type { ChannelIconInbox } from 'dashboard/components-next/icon/ChannelIcon';
import { t } from '../../../i18n';
import FilterChip from './FilterChip';

// Chip một hộp thư (icon kênh + tên + số chưa đọc): bảng Lọc và hàng chip kênh của
// điện thoại dùng chung để hai nơi luôn trông và đếm như nhau.
interface InboxFilterChipProps {
    inbox: ChannelIconInbox & { name: string };
    isSelected: boolean;
    unreadCount: number;
    onToggle: () => void;
}

export default function InboxFilterChip({ inbox, isSelected, unreadCount, onToggle }: InboxFilterChipProps) {
    return (
        <FilterChip isSelected={isSelected} aria-pressed={isSelected} title={inbox.name} onClick={onToggle}>
            <ChannelIcon inbox={inbox} className="size-3.5 shrink-0" />
            <span className="truncate max-w-[10rem]">{inbox.name}</span>
            {unreadCount > 0 ? (
                <span className="tabular-nums text-n-slate-10" aria-label={t('CHAT_LIST.FILTER_PANEL.UNREAD', { count: unreadCount })}>
                    {unreadCount}
                </span>
            ) : null}
        </FilterChip>
    );
}
