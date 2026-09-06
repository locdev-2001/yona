import { useState } from 'react';
import { picoSearch } from '@chatwoot/pico-search';

import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import {
    DropdownBody,
    DropdownContainer,
    DropdownItem,
    DropdownSection,
} from 'dashboard/components-next/dropdown-menu/base';
import { focusOnMount } from 'shared/helpers/focusOnMount';
import { t } from '../../../../i18n';
import type { FilterOption } from '../helper/filterHelper';

// Port từ components-next/filter/inputs/SingleSelect.vue (bỏ nhánh EmojiIcon).
interface SingleSelectProps {
    options: FilterOption[];
    value: FilterOption | null;
    onChange: (value: FilterOption | null) => void;
    asyncSearch?: boolean;
    isSearching?: boolean;
    disableSearch?: boolean;
    disableDeselect?: boolean;
    placeholderIcon?: string;
    placeholder?: string;
    placeholderTrailingIcon?: boolean;
    searchPlaceholder?: string;
    dropdownMaxHeight?: string;
    onSearch?: (query: string) => void;
}

export default function SingleSelect({
    options,
    value,
    onChange,
    asyncSearch = false,
    isSearching = false,
    disableSearch = false,
    disableDeselect = false,
    placeholderIcon = 'i-lucide-plus',
    placeholder = '',
    placeholderTrailingIcon = false,
    searchPlaceholder = '',
    dropdownMaxHeight = 'max-h-80',
    onSearch,
}: SingleSelectProps) {
    const [searchTerm, setSearchTerm] = useState('');


    const searchResults = asyncSearch ? options : picoSearch(options ?? [], searchTerm, ['name']);

    const selectedItem = (() => {
        if (!options || !value) return null;
        const optionToSearch = Array.isArray(value) ? value[0] : value;
        if (!optionToSearch) return null;
        return (
            options.find(option => option.id === optionToSearch.id) ||
            (asyncSearch && optionToSearch.id !== undefined ? optionToSearch : null)
        );
    })();

    const toggleSelected = (option: FilterOption) => {
        const optionToToggle = { id: option.id, name: option.name };
        if (value && value.id === optionToToggle.id) {
            if (!disableDeselect) onChange(null);
        } else {
            onChange(optionToToggle);
        }
    };

    return (
        <DropdownContainer
            menu={
                <DropdownBody className="top-0 min-w-56 z-50" strong>
                    {!disableSearch ? (
                        <div className="relative">
                            <Icon className="absolute size-4 left-2 top-2" icon="i-lucide-search" />
                            <input
                                ref={focusOnMount}
                                value={searchTerm}
                                onChange={event => {
                                    setSearchTerm(event.target.value);
                                    onSearch?.(event.target.value);
                                }}
                                className="p-1.5 pl-8 text-n-slate-11 bg-n-alpha-1 rounded-lg w-full"
                                placeholder={searchPlaceholder || t('COMBOBOX.SEARCH_PLACEHOLDER')}
                            />
                        </div>
                    ) : null}
                    <DropdownSection height={dropdownMaxHeight}>
                        {isSearching ? (
                            <DropdownItem disabled>{t('DROPDOWN_MENU.SEARCHING')}</DropdownItem>
                        ) : searchResults.length ? (
                            searchResults.map(option => (
                                <DropdownItem
                                    key={String(option.id)}
                                    icon={option.icon}
                                    labelSlot={
                                        <>
                                            {option.name}
                                            {selectedItem && selectedItem.id === option.id ? (
                                                <Icon icon="i-lucide-check" className="bg-n-blue-text pointer-events-none" />
                                            ) : null}
                                        </>
                                    }
                                    onClick={() => toggleSelected(option)}
                                />
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
            {({ toggle }) =>
                selectedItem ? (
                    <Button type="button" sm slate faded icon={selectedItem.icon} label={selectedItem.name} onClick={toggle} />
                ) : (
                    <Button
                        type="button"
                        sm
                        slate
                        faded
                        trailingIcon={placeholderTrailingIcon}
                        icon={<Icon icon={placeholderIcon} className="text-n-slate-11" />}
                        onClick={toggle}
                    >
                        <span className="text-n-slate-11">{placeholder || t('COMBOBOX.PLACEHOLDER')}</span>
                    </Button>
                )
            }
        </DropdownContainer>
    );
}
