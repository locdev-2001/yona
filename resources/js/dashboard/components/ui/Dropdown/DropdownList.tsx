import { useRef, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { picoSearch } from '@ext/pico-search';

import Button from 'dashboard/components-next/button/Button';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { t } from '../../../../i18n';
import { ICONS } from 'dashboard/icons';

// Port từ dashboard/components/ui/Dropdown/{DropdownList,DropdownListItemButton,
// DropdownSearch,DropdownEmptyState}.vue — gộp một file vì chỉ dùng cùng nhau.
// `children` thay slot `listItem` của bản gốc (AddFilterChip cần dựng menu con).

export interface DropdownListItem {
    id: string | number;
    name: string;
    icon?: string;
    iconColor?: string;
    [key: string]: unknown;
}

interface DropdownListItemButtonProps {
    buttonText?: string;
    isActive?: boolean;
    icon?: string;
    iconColor?: string;
    dropdown?: ReactNode;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onFocus?: () => void;
}

export function DropdownListItemButton({
    buttonText = '',
    isActive = false,
    icon = '',
    iconColor = '',
    dropdown,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
}: DropdownListItemButtonProps) {
    return (
        <button
            type="button"
            className="relative inline-flex items-center justify-start w-full p-3 border-0 rounded-none first:rounded-t-xl last:rounded-b-xl h-11 hover:enabled:bg-n-surface-hover"
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onFocus}
        >
            <div className="inline-flex items-center gap-3 overflow-hidden">
                {icon && <span className={`${icon} size-[1.125rem]`} style={iconColor ? { color: iconColor } : undefined} aria-hidden="true" />}
                <span className="text-sm font-medium truncate text-n-slate-12">{buttonText}</span>
                {isActive && <span className={`${ICONS.check} size-[1.125rem] flex-shrink-0 text-n-slate-12`} aria-hidden="true" />}
            </div>
            {dropdown}
        </button>
    );
}

interface DropdownListProps {
    listItems?: DropdownListItem[];
    enableSearch?: boolean;
    inputPlaceholder?: string;
    activeFilterId?: string | number | null;
    showClearFilter?: boolean;
    className?: string;
    children?: ReactNode;
    onSelect?: (item: DropdownListItem) => void;
    onRemoveFilter?: () => void;
    onClickAway?: () => void;
}

export default function DropdownList({
    listItems = [],
    enableSearch = false,
    inputPlaceholder = '',
    activeFilterId = null,
    showClearFilter = false,
    className = '',
    children,
    onSelect,
    onRemoveFilter,
    onClickAway,
}: DropdownListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);

    useClickAway(rootRef, () => onClickAway?.(), Boolean(onClickAway));

    const filteredListItems = searchTerm ? picoSearch(listItems, searchTerm, ['name']) : listItems;
    const isFilterActive = (id: string | number) => (activeFilterId ? id === activeFilterId : false);

    return (
        <div
            ref={rootRef}
            className={`absolute z-20 w-40 overlay-surface rounded-xl max-h-[400px] ${className}`}
            onClick={event => event.stopPropagation()}
        >
            {enableSearch && (
                <div className="flex items-center justify-between h-10 min-h-[40px] sticky top-0 bg-n-surface-raised z-10 gap-2 px-3 rounded-t-xl">
                    <div className="flex items-center w-full gap-2">
                        <span className={`${ICONS.search} size-4 text-n-slate-11 flex-shrink-0`} aria-hidden="true" />
                        <input
                            value={searchTerm}
                            placeholder={inputPlaceholder}
                            type="search"
                            className="w-full mb-0 text-sm !outline-0 !outline-none bg-transparent text-n-slate-12 placeholder:text-n-slate-10 reset-base"
                            onChange={event => setSearchTerm(event.target.value)}
                        />
                    </div>
                    {!searchTerm && showClearFilter && (
                        <Button
                            faded
                            xs
                            className="flex-shrink-0"
                            label={t('REPORT.FILTER_ACTIONS.CLEAR_FILTER')}
                            onClick={() => onRemoveFilter?.()}
                        />
                    )}
                </div>
            )}
            {children ?? (
                !filteredListItems.length ? (
                    <div className="flex items-center justify-center h-10 text-sm text-n-slate-11">
                        {t('REPORT.FILTER_ACTIONS.EMPTY_LIST')}
                    </div>
                ) : (
                    filteredListItems.map(item => (
                        <DropdownListItemButton
                            key={item.id}
                            buttonText={item.name}
                            icon={item.icon}
                            iconColor={item.iconColor}
                            isActive={isFilterActive(item.id)}
                            onClick={event => {
                                event.stopPropagation();
                                event.preventDefault();
                                onSelect?.(item);
                            }}
                        />
                    ))
                )
            )}
        </div>
    );
}
