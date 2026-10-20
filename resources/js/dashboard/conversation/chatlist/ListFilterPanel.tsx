import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import type { ReactNode } from 'react';
import { usePage } from '@inertiajs/react';

import { useChannelPreferences } from 'dashboard/components-next/sidebar/useChannelPreferences';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import { useNotificationsUnreadInboxCounts } from 'dashboard/notifications/useUnreadCount';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { countActiveListFilters } from '../listFilters';
import FilterChip from './FilterChip';
import InboxFilterChip from './InboxFilterChip';
import {
    CLEARED_LIST_FILTERS,
    QUICK_STATUS_VALUES,
    sortLabelKey,
    sortValuesFor,
    statusLabelKey,
    toggledInboxIds,
    toggledLabels,
} from './listFilterOptions';

// Nội dung bảng Lọc, không kèm vỏ: máy tính bọc bằng popover, điện thoại bọc bằng
// bottom sheet. Bấm chip là lọc ngay, không có nút Áp dụng.
interface ListFilterPanelProps {
    onOpenAdvancedFilters: () => void;
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
    return (
        <fieldset className="flex flex-col gap-1.5 min-w-0 m-0 p-0 border-0">
            <legend className="mb-1.5 p-0 text-xs font-medium text-n-slate-11">{title}</legend>
            <div className="flex flex-wrap gap-1.5">{children}</div>
        </fieldset>
    );
}

export default function ListFilterPanel({ onOpenAdvancedFilters }: ListFilterPanelProps) {
    const { accountId, listFilters, setListFilters } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const { visibleInboxes } = useChannelPreferences(inboxes);
    const accountLabels = useLabelsList(accountId);
    const inboxUnreadCounts = useNotificationsUnreadInboxCounts();
    const activeFilterCount = countActiveListFilters(listFilters);

    return (
        <div className="flex flex-col gap-4 p-3 min-w-0">
            {isProductFeatureVisible('conversationStatus') ? (
            <FilterGroup title={t('CHAT_LIST.FILTER_PANEL.STATUS')}>
                {QUICK_STATUS_VALUES.map(status => (
                    <FilterChip
                        key={status}
                        isSelected={listFilters.status === status}
                        aria-pressed={listFilters.status === status}
                        onClick={() => setListFilters({ status })}
                    >
                        {t(statusLabelKey(status))}
                    </FilterChip>
                ))}
            </FilterGroup>
            ) : null}
            {visibleInboxes.length ? (
                <FilterGroup title={t('CHAT_LIST.FILTER_PANEL.CHANNEL')}>
                    {visibleInboxes.map(inbox => (
                        <InboxFilterChip
                            key={inbox.id}
                            inbox={inbox}
                            isSelected={listFilters.inboxIds.includes(inbox.id)}
                            unreadCount={inboxUnreadCounts[String(inbox.id)] ?? 0}
                            onToggle={() => setListFilters({ inboxIds: toggledInboxIds(listFilters.inboxIds, inbox.id) })}
                        />
                    ))}
                </FilterGroup>
            ) : null}
            {accountLabels.length ? (
                <FilterGroup title={t('CHAT_LIST.FILTER_PANEL.LABEL')}>
                    {accountLabels.map(label => {
                        const isSelected = listFilters.labels.includes(label.title);

                        return (
                            <FilterChip
                                key={label.id}
                                isSelected={isSelected}
                                aria-pressed={isSelected}
                                onClick={() => setListFilters({ labels: toggledLabels(listFilters.labels, label.title) })}
                            >
                                <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: label.color }} aria-hidden="true" />
                                <span className="truncate max-w-[10rem]">{label.title}</span>
                            </FilterChip>
                        );
                    })}
                </FilterGroup>
            ) : null}
            <FilterGroup title={t('CHAT_LIST.FILTER_PANEL.SORT')}>
                {sortValuesFor(listFilters.sortBy).map(sortBy => (
                    <FilterChip
                        key={sortBy}
                        isSelected={listFilters.sortBy === sortBy}
                        aria-pressed={listFilters.sortBy === sortBy}
                        onClick={() => setListFilters({ sortBy })}
                    >
                        {t(sortLabelKey(sortBy))}
                    </FilterChip>
                ))}
            </FilterGroup>
            <div className="flex items-center justify-between gap-2 pt-1">
                <button
                    type="button"
                    className="h-11 md:h-8 px-1 rounded text-sm text-n-blue-11 hover:underline focus-visible:outline-2 focus-visible:outline-n-brand"
                    onClick={onOpenAdvancedFilters}
                >
                    {t('CHAT_LIST.FILTER_PANEL.ADVANCED')}
                </button>
                <button
                    type="button"
                    disabled={activeFilterCount === 0}
                    className="h-11 md:h-8 px-1 rounded text-sm text-n-slate-11 enabled:hover:text-n-slate-12 enabled:hover:underline disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-n-brand"
                    onClick={() => setListFilters(CLEARED_LIST_FILTERS)}
                >
                    {t('CHAT_LIST.FILTER_PANEL.CLEAR')}
                </button>
            </div>
        </div>
    );
}
