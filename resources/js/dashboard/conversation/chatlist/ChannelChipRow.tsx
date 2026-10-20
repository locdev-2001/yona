import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Icon from 'dashboard/components-next/icon/Icon';
import { useChannelPreferences } from 'dashboard/components-next/sidebar/useChannelPreferences';
import { useNotificationsUnreadInboxCounts } from 'dashboard/notifications/useUnreadCount';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import FilterChip from './FilterChip';
import InboxFilterChip from './InboxFilterChip';
import { toggledInboxIds } from './listFilterOptions';

// Điện thoại: đổi kênh một chạm ngay trên danh sách, không mở ngăn kéo hay bảng Lọc.
// Ghi cùng `listFilters.inboxIds` với bảng Lọc nên hai nơi luôn khớp nhau.
// Thu gọn là một hàng cuộn ngang; mở rộng thì xuống dòng để thấy hết và chọn nhanh, chọn xong tự thu lại.
export function hasChannelChipRow(inboxCount: number): boolean {
    return inboxCount > 1;
}

export default function ChannelChipRow() {
    const { listFilters, setListFilters } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const { visibleInboxes } = useChannelPreferences(inboxes);
    const inboxUnreadCounts = useNotificationsUnreadInboxCounts();
    const rowRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setExpanded] = useState(false);
    const selectedInboxId = listFilters.inboxIds[0] ?? 0;

    useEffect(() => {
        rowRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [selectedInboxId, isExpanded]);

    if (!hasChannelChipRow(inboxes.length)) return null;

    const isAllChannels = listFilters.inboxIds.length === 0;
    const selectInboxes = (inboxIds: number[]) => {
        setListFilters({ inboxIds });
        setExpanded(false);
    };

    return (
        <div className="md:hidden flex items-start gap-1 min-w-0 ps-3 pe-1 pb-2">
        <div
            ref={rowRef}
            id="channel-chip-row"
            role="group"
            aria-label={t('CHAT_LIST.FILTER_PANEL.CHANNEL')}
            className={`flex flex-1 gap-1.5 min-w-0 ${
                isExpanded ? 'flex-wrap' : 'overflow-x-auto [&>*]:shrink-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
            }`}
        >
            <FilterChip
                isSelected={isAllChannels}
                aria-pressed={isAllChannels}
                onClick={() => selectInboxes([])}
            >
                {t('CHAT_LIST.FILTER_PANEL.ALL_CHANNELS')}
            </FilterChip>
            {visibleInboxes.map(inbox => (
                <InboxFilterChip
                    key={inbox.id}
                    inbox={inbox}
                    isSelected={listFilters.inboxIds.includes(inbox.id)}
                    unreadCount={inboxUnreadCounts[String(inbox.id)] ?? 0}
                    onToggle={() => selectInboxes(toggledInboxIds(listFilters.inboxIds, inbox.id))}
                />
            ))}
        </div>
        <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls="channel-chip-row"
            aria-label={t(isExpanded ? 'CHAT_LIST.FILTER_PANEL.COLLAPSE_CHANNELS' : 'CHAT_LIST.FILTER_PANEL.SHOW_ALL_CHANNELS')}
            className="grid place-content-center size-9 shrink-0 rounded-full text-n-slate-11 active:scale-[0.97]"
            onClick={() => setExpanded(expanded => !expanded)}
        >
            <Icon icon={isExpanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'} className="size-4" />
        </button>
        </div>
    );
}
