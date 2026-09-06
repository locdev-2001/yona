import DropdownButton from 'dashboard/components/ui/Dropdown/DropdownButton';
import DropdownList, { type DropdownListItem } from 'dashboard/components/ui/Dropdown/DropdownList';

// Port từ reports/components/Filters/v3/ActiveFilterChip.vue
interface ActiveFilterChipProps {
    name: string;
    id?: number | string | null;
    type: string;
    options?: DropdownListItem[];
    activeFilterType?: string;
    showMenu?: boolean;
    placeholder?: string;
    enableSearch?: boolean;
    showClearFilter?: boolean;
    onToggleDropdown: (type: string) => void;
    onCloseDropdown: () => void;
    onAddFilter: (item: DropdownListItem) => void;
    onRemoveFilter?: (type: string) => void;
}

export default function ActiveFilterChip({
    name,
    id = null,
    type,
    options = [],
    activeFilterType = '',
    showMenu = false,
    placeholder = '',
    enableSearch = false,
    showClearFilter = true,
    onToggleDropdown,
    onCloseDropdown,
    onAddFilter,
    onRemoveFilter,
}: ActiveFilterChipProps) {
    return (
        <DropdownButton
            trailingIcon
            icon="i-lucide-chevron-down"
            buttonText={name}
            onClick={() => onToggleDropdown(type)}
            dropdown={
                showMenu && activeFilterType === type && options ? (
                    <DropdownList
                        showClearFilter={showClearFilter}
                        listItems={options}
                        activeFilterId={id}
                        inputPlaceholder={placeholder}
                        enableSearch={enableSearch}
                        className="flex flex-col w-[240px] overflow-y-auto left-0 md:left-auto md:right-0 top-10"
                        onSelect={onAddFilter}
                        onRemoveFilter={() => onRemoveFilter?.(type)}
                        onClickAway={onCloseDropdown}
                    />
                ) : undefined
            }
        />
    );
}
