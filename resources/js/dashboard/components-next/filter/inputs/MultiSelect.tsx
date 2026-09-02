import { useEffect, useRef, useState } from 'react';
import { picoSearch } from '@chatwoot/pico-search';

import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import {
    DropdownBody,
    DropdownContainer,
    DropdownItem,
    DropdownSection,
} from 'dashboard/components-next/dropdown-menu/base';
import { t } from '../../../../i18n';
import { DROPDOWN_SEARCH_THRESHOLD } from '../helper/filterHelper';
import type { FilterOption } from '../helper/filterHelper';

// Port từ components-next/filter/inputs/MultiSelect.vue (bỏ nhánh EmojiIcon —
// team icon chưa share ở B3). Giá trị lưu {id, name} không kèm icon như gốc.
interface MultiSelectProps {
    options: FilterOption[];
    value: FilterOption[];
    onChange: (value: FilterOption[]) => void;
    maxChips?: number;
    dropdownMaxHeight?: string;
}

const stripOption = (option: FilterOption): FilterOption => ({ id: option.id, name: option.name });

export default function MultiSelect({
    options,
    value,
    onChange,
    maxChips = 3,
    dropdownMaxHeight = 'max-h-80',
}: MultiSelectProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const showSearch = options.length > DROPDOWN_SEARCH_THRESHOLD;

    const query = searchTerm.trim();
    const searchResults = query ? picoSearch(options, query, ['name']) : options;

    const hasItems = Array.isArray(value) && value.length > 0;
    const selectedIds = hasItems ? value.map(item => item.id) : [];
    const selectedItems = hasItems ? options.filter(option => selectedIds.includes(option.id)) : [];
    const selectedVisibleItems =
        selectedItems.length === maxChips + 1 ? selectedItems : selectedItems.slice(0, maxChips);
    const remainingItems = selectedItems.length === maxChips + 1 ? [] : selectedItems.slice(maxChips);
    const remainingTooltip = remainingItems.map(item => item.name).join(', ');

    useEffect(() => {
        searchInputRef.current?.focus();
    });

    const toggleOption = (option: FilterOption) => {
        const optionToToggle = stripOption(option);
        if (!hasItems) {
            onChange([optionToToggle]);
            return;
        }
        if (selectedIds.includes(optionToToggle.id)) {
            onChange(value.filter(item => item.id !== optionToToggle.id));
        } else {
            onChange([...value, optionToToggle]);
        }
    };

    return (
        <DropdownContainer
            menu={
                <DropdownBody className="top-0 min-w-48 z-50" strong>
                    {showSearch ? (
                        <div className="relative">
                            <Icon className="absolute size-4 left-2 top-2" icon="i-lucide-search" />
                            <input
                                ref={searchInputRef}
                                value={searchTerm}
                                onChange={event => setSearchTerm(event.target.value)}
                                className="p-1.5 pl-8 text-n-slate-11 bg-n-alpha-1 rounded-lg w-full"
                                placeholder={t('COMBOBOX.SEARCH_PLACEHOLDER')}
                            />
                        </div>
                    ) : null}
                    <DropdownSection height={dropdownMaxHeight}>
                        {searchResults.length ? (
                            searchResults.map(option => (
                                <DropdownItem key={String(option.id)} preserveOpen onClick={() => toggleOption(option)}>
                                    {option.color ? (
                                        <span
                                            className="flex-shrink-0 rounded-full size-1.5"
                                            style={{ backgroundColor: option.color }}
                                        />
                                    ) : option.icon ? (
                                        <Icon icon={option.icon} className="size-4 text-n-slate-11" />
                                    ) : null}
                                    <span className="flex items-center justify-between w-full gap-2 min-w-0">
                                        <span className="truncate">{option.name}</span>
                                        {selectedIds.includes(option.id) ? (
                                            <Icon icon="i-lucide-check" className="bg-n-blue-text pointer-events-none" />
                                        ) : null}
                                    </span>
                                </DropdownItem>
                            ))
                        ) : (
                            <DropdownItem disabled>
                                {searchTerm
                                    ? t('COMBOBOX.EMPTY_SEARCH_RESULTS', { searchTerm })
                                    : t('COMBOBOX.EMPTY_STATE')}
                            </DropdownItem>
                        )}
                    </DropdownSection>
                </DropdownBody>
            }
        >
            {({ toggle }) => {
                const open = () => {
                    setSearchTerm('');
                    toggle();
                };
                return hasItems ? (
                    <button type="button" className="bg-n-alpha-2 py-2 rounded-lg h-8 flex items-center px-0" onClick={open}>
                        {selectedVisibleItems.map(item => (
                            <div
                                key={item.name}
                                className="px-3 border-r rtl:border-l rtl:border-r-0 border-n-weak text-n-slate-12 text-sm flex gap-2 items-center max-w-[100px]"
                            >
                                {item.icon ? <Icon icon={item.icon} className="flex-shrink-0" /> : null}
                                {item.color ? (
                                    <span
                                        className="flex-shrink-0 rounded-full size-1.5"
                                        style={{ backgroundColor: item.color }}
                                    />
                                ) : null}
                                <span className="truncate">{item.name}</span>
                            </div>
                        ))}
                        {remainingItems.length > 0 ? (
                            <div
                                title={remainingTooltip}
                                className="px-3 border-r rtl:border-l rtl:border-r-0 border-n-weak text-n-slate-12 text-sm flex gap-2 items-center max-w-[100px]"
                            >
                                <span className="truncate">{t('COMBOBOX.MORE', { count: remainingItems.length })}</span>
                            </div>
                        ) : null}
                        <div className="flex items-center border-none px-3 gap-2">
                            <Icon icon="i-lucide-plus" />
                        </div>
                    </button>
                ) : (
                    <Button
                        type="button"
                        sm
                        slate
                        faded
                        icon={<Icon icon="i-lucide-plus" className="text-n-slate-11" />}
                        onClick={open}
                    >
                        <span className="text-n-slate-11">{t('COMBOBOX.PLACEHOLDER')}</span>
                    </Button>
                );
            }}
        </DropdownContainer>
    );
}
