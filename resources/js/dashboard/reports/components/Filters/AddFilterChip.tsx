import { useState } from 'react';

import DropdownButton from 'dashboard/components/ui/Dropdown/DropdownButton';
import DropdownList, {
    DropdownListItemButton,
    type DropdownListItem,
} from 'dashboard/components/ui/Dropdown/DropdownList';
import { t } from '../../../../i18n';

// Port từ reports/components/Filters/v3/AddFilterChip.vue
export interface FilterMenuOption extends DropdownListItem {
    type: string;
    options: DropdownListItem[];
}

interface AddFilterChipProps {
    name: string;
    menuOption?: FilterMenuOption[];
    showMenu?: boolean;
    placeholderI18nKey?: string;
    enableSearch?: boolean;
    emptyStateMessage?: string;
    onToggleDropdown: () => void;
    onCloseDropdown: () => void;
    onAddFilter: (item: DropdownListItem) => void;
}

export default function AddFilterChip({
    name,
    menuOption = [],
    showMenu = false,
    placeholderI18nKey = '',
    enableSearch = true,
    emptyStateMessage = '',
    onToggleDropdown,
    onCloseDropdown,
    onAddFilter,
}: AddFilterChipProps) {
    const [hoveredItemId, setHoveredItemId] = useState<string | number | null>(null);

    const hideSubMenu = () => setHoveredItemId(null);

    return (
        <DropdownButton
            buttonText={name}
            icon="i-lucide-filter"
            onClick={onToggleDropdown}
            dropdown={
                showMenu ? (
                    <DropdownList
                        className="left-0 md:right-0 top-10"
                        onClickAway={() => {
                            hideSubMenu();
                            onCloseDropdown();
                        }}
                    >
                        {!menuOption.length ? (
                            <div className="flex items-center justify-center h-10 text-sm text-n-slate-11">
                                {emptyStateMessage}
                            </div>
                        ) : (
                            menuOption.map(item => (
                                <DropdownListItemButton
                                    key={item.id}
                                    buttonText={item.name}
                                    onMouseEnter={() => setHoveredItemId(item.id)}
                                    onMouseLeave={hideSubMenu}
                                    onFocus={() => setHoveredItemId(item.id)}
                                    dropdown={
                                        item.options && hoveredItemId === item.id ? (
                                            <DropdownList
                                                listItems={item.options}
                                                inputPlaceholder={t(`${placeholderI18nKey}.${item.type.toUpperCase()}`)}
                                                enableSearch={enableSearch}
                                                className="flex flex-col w-[216px] overflow-y-auto top-0 left-36"
                                                onSelect={selected => {
                                                    onAddFilter(selected);
                                                    hideSubMenu();
                                                }}
                                            />
                                        ) : undefined
                                    }
                                />
                            ))
                        )}
                    </DropdownList>
                ) : undefined
            }
        />
    );
}
