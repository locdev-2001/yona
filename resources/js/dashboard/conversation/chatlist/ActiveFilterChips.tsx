import { usePage } from '@inertiajs/react';

import ChannelIcon from 'dashboard/components-next/icon/ChannelIcon';
import { useLabelsList } from 'dashboard/composables/useLabelsList';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import FilterChip from './FilterChip';
import { activeFilterChips, statusLabelKey } from './listFilterOptions';
import type { ActiveFilterChip } from './listFilterOptions';

// Hàng chip dưới tab: bộ lọc nào đang thu hẹp danh sách thì hiện ở đây, bấm là bỏ.
// `hidesInboxChipsBelowMd`: điện thoại đã có hàng chip kênh ngay trên, chip kênh đang
// bật không lặp lại ở đây.
export default function ActiveFilterChips({ hidesInboxChipsBelowMd = false }: { hidesInboxChipsBelowMd?: boolean } = {}) {
    const { accountId, listFilters, setListFilters } = useConversation();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;
    const accountLabels = useLabelsList(accountId);
    const chips = activeFilterChips(listFilters);

    if (!chips.length) return null;

    const isHiddenBelowMd = (chip: ActiveFilterChip) => hidesInboxChipsBelowMd && chip.kind === 'inbox';
    const isEveryChipHiddenBelowMd = chips.every(isHiddenBelowMd);

    const renderContent = (chip: ActiveFilterChip) => {
        if (chip.kind === 'inbox') {
            const inbox = inboxes.find(item => item.id === chip.inboxId);
            const name = inbox?.name ?? `#${chip.inboxId}`;

            return {
                name,
                content: (
                    <>
                        {inbox ? <ChannelIcon inbox={inbox} className="size-3.5 shrink-0" /> : null}
                        <span className="truncate">{name}</span>
                    </>
                ),
            };
        }

        if (chip.kind === 'label') {
            const color = accountLabels.find(label => label.title === chip.label)?.color;

            return {
                name: chip.label ?? '',
                content: (
                    <>
                        {color ? <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" /> : null}
                        <span className="truncate">{chip.label}</span>
                    </>
                ),
            };
        }

        const name = t(statusLabelKey(chip.status!));
        return { name, content: <span className="truncate">{name}</span> };
    };

    return (
        <ul
            className={`flex flex-wrap gap-1.5 m-0 px-3 pt-1 pb-2 list-none ${isEveryChipHiddenBelowMd ? 'max-md:hidden' : ''}`}
            aria-label={t('CHAT_LIST.FILTER_PANEL.ACTIVE')}>
            {chips.map(chip => {
                const { name, content } = renderContent(chip);

                return (
                    <li key={chip.key} className={`min-w-0 max-w-full ${isHiddenBelowMd(chip) ? 'max-md:hidden' : ''}`}>
                        <FilterChip
                            isSelected
                            className="max-w-[14rem]"
                            title={t('CHAT_LIST.FILTER_PANEL.REMOVE', { name })}
                            aria-label={t('CHAT_LIST.FILTER_PANEL.REMOVE', { name })}
                            onClick={() => setListFilters(chip.removal)}
                        >
                            {content}
                            <span className="i-lucide-x size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                        </FilterChip>
                    </li>
                );
            })}
        </ul>
    );
}
