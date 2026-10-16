import { useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';

import { useNotificationsUnreadInboxCounts } from 'dashboard/notifications/useUnreadCount';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import FilterChip from './FilterChip';
import InboxFilterChip from './InboxFilterChip';
import { toggledInboxIds } from './listFilterOptions';

// Điện thoại: đổi kênh một chạm ngay trên danh sách, không mở ngăn kéo hay bảng Lọc.
// Ghi cùng `listFilters.inboxIds` với bảng Lọc nên hai nơi luôn khớp nhau.
export function hasChannelChipRow(inboxCount: number): boolean {
    return inboxCount > 1;
}

export default function ChannelChipRow() {
    const { listFilters, setListFilters } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const inboxUnreadCounts = useNotificationsUnreadInboxCounts();
    const rowRef = useRef<HTMLDivElement>(null);
    const selectedInboxId = listFilters.inboxIds[0] ?? 0;

    useEffect(() => {
        rowRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [selectedInboxId]);

    if (!hasChannelChipRow(inboxes.length)) return null;

    const isAllChannels = listFilters.inboxIds.length === 0;

    return (
        <div
            ref={rowRef}
            role="group"
            aria-label={t('CHAT_LIST.FILTER_PANEL.CHANNEL')}
            className="md:hidden flex gap-1.5 min-w-0 px-3 pb-2 overflow-x-auto [&>*]:shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            <FilterChip
                isSelected={isAllChannels}
                aria-pressed={isAllChannels}
                onClick={() => setListFilters({ inboxIds: [] })}
            >
                {t('CHAT_LIST.FILTER_PANEL.ALL_CHANNELS')}
            </FilterChip>
            {inboxes.map(inbox => (
                <InboxFilterChip
                    key={inbox.id}
                    inbox={inbox}
                    isSelected={listFilters.inboxIds.includes(inbox.id)}
                    unreadCount={inboxUnreadCounts[String(inbox.id)] ?? 0}
                    onToggle={() => setListFilters({ inboxIds: toggledInboxIds(listFilters.inboxIds, inbox.id) })}
                />
            ))}
        </div>
    );
}
