import { useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { t } from '../../../i18n';
import { INBOX_DISPLAY_BY, INBOX_FILTER_TYPE, INBOX_SORT_BY } from '../helpers';
import type { NotificationFilters } from '../types';

// Port từ routes/dashboard/inbox/components/InboxDisplayMenu.vue — bộ lọc hiển
// thị lưu trong ui_settings.inbox_filter_by (do NotificationsContext ghi).

const DISPLAY_OPTIONS = [
    { key: INBOX_DISPLAY_BY.SNOOZED, type: INBOX_FILTER_TYPE.STATUS, labelKey: 'INBOX.DISPLAY_MENU.DISPLAY_OPTIONS.SNOOZED' },
    { key: INBOX_DISPLAY_BY.READ, type: INBOX_FILTER_TYPE.TYPE, labelKey: 'INBOX.DISPLAY_MENU.DISPLAY_OPTIONS.READ' },
];

const SORT_OPTIONS = [
    { key: INBOX_SORT_BY.NEWEST, labelKey: 'INBOX.DISPLAY_MENU.SORT_OPTIONS.NEWEST' },
    { key: INBOX_SORT_BY.OLDEST, labelKey: 'INBOX.DISPLAY_MENU.SORT_OPTIONS.OLDEST' },
];

interface InboxDisplayMenuProps {
    filters: NotificationFilters;
    className?: string;
    onFilter: (option: { key: string; type: string; selected?: boolean }) => void;
}

export default function InboxDisplayMenu({ filters, className = '', onFilter }: InboxDisplayMenuProps) {
    const [showSortMenu, setShowSortMenu] = useState(false);
    const sortMenuRef = useRef<HTMLDivElement>(null);
    useClickAway(sortMenuRef, () => setShowSortMenu(false), showSortMenu);

    const activeSort = filters.sortOrder || INBOX_SORT_BY.NEWEST;
    const activeSortLabel = t(SORT_OPTIONS.find(option => option.key === activeSort)?.labelKey ?? '');
    const isSelected = (option: (typeof DISPLAY_OPTIONS)[number]) =>
        option.type === INBOX_FILTER_TYPE.STATUS ? filters.status === option.key : filters.type === option.key;

    return (
        <div
            className={`flex flex-col bg-n-alpha-3 backdrop-blur-[100px] border-0 outline outline-1 outline-n-container shadow-lg z-50 max-w-64 min-w-[170px] w-fit rounded-xl divide-y divide-n-weak ${className}`}
        >
            <div className="flex items-center gap-2 justify-between p-3 rounded-t-lg h-11">
                <div className="flex gap-1.5 min-w-0">
                    <span className="i-lucide-arrow-down-up size-3.5 text-n-slate-12" />
                    <span className="text-xs font-medium text-n-slate-12 truncate min-w-0">
                        {t('INBOX.DISPLAY_MENU.SORT')}
                    </span>
                </div>
                <div ref={sortMenuRef} className="relative">
                    <Button
                        label={activeSortLabel}
                        icon="i-lucide-chevron-down"
                        slate
                        trailingIcon
                        xs
                        outline
                        className="w-fit min-w-20 max-w-32"
                        onClick={() => setShowSortMenu(open => !open)}
                    />
                    {showSortMenu ? (
                        <div className="absolute flex flex-col gap-0.5 bg-n-alpha-3 backdrop-blur-[100px] z-60 rounded-lg p-0.5 w-fit min-w-20 max-w-32 top-px outline outline-1 outline-n-container">
                            {SORT_OPTIONS.map(option => (
                                <div
                                    key={option.key}
                                    role="button"
                                    className={`flex rounded-md h-5 w-full items-center justify-between px-1.5 py-0.5 gap-2 whitespace-nowrap ${
                                        activeSort === option.key ? 'bg-n-brand/10' : ''
                                    }`}
                                    onClick={event => {
                                        event.stopPropagation();
                                        setShowSortMenu(false);
                                        onFilter({ key: option.key, type: INBOX_FILTER_TYPE.SORT_ORDER });
                                    }}
                                >
                                    <span
                                        className={`text-xs font-medium hover:text-n-brand truncate min-w-0 ${
                                            activeSort === option.key ? 'text-n-blue-11' : 'text-n-slate-11'
                                        }`}
                                    >
                                        {t(option.labelKey)}
                                    </span>
                                    {activeSort === option.key ? (
                                        <span className="i-lucide-check size-2.5 flex-shrink-0 text-n-blue-11" />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
            <div>
                <span className="px-3 py-4 text-xs font-medium text-n-slate-11">{t('INBOX.DISPLAY_MENU.DISPLAY')}</span>
                <div className="flex flex-col divide-y divide-n-weak">
                    {DISPLAY_OPTIONS.map(option => (
                        <div key={option.key} className="flex items-center px-3 py-2 gap-1.5 h-9">
                            <input
                                id={option.key}
                                type="checkbox"
                                name={option.key}
                                checked={isSelected(option)}
                                className="m-0 border-[1.5px] shadow border-n-weak appearance-none rounded-[4px] w-4 h-4 focus:ring-1 focus:ring-n-weak checked:bg-n-brand after:content-[''] after:text-white checked:after:content-['✓'] after:flex after:items-center after:justify-center checked:border-t checked:border-n-blue-10 checked:border-b-0 checked:border-r-0 checked:border-l-0 after:text-center after:text-xs after:font-bold after:relative after:-top-[1.5px]"
                                onChange={() =>
                                    onFilter({ key: option.key, type: option.type, selected: !isSelected(option) })
                                }
                            />
                            <label
                                htmlFor={option.key}
                                className="text-xs font-medium text-n-slate-12 !ml-0 !mr-0"
                            >
                                {t(option.labelKey)}
                            </label>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
