import { forwardRef, useImperativeHandle, useRef } from 'react';

import { t } from '../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import Spinner from 'dashboard/components-next/spinner/Spinner';

// Port từ components-next/combobox/ComboBoxDropdown.vue.
export interface ComboBoxDropdownOption {
    value: string | number;
    label: string;
    subtitle?: string;
    icon?: string;
    iconColor?: string;
}

export interface ComboBoxDropdownHandle {
    focus: () => void;
}

interface ComboBoxDropdownProps {
    open: boolean;
    options: ComboBoxDropdownOption[];
    searchValue?: string;
    searchPlaceholder?: string;
    emptyState?: string;
    multiple?: boolean;
    selectedValues?: string | number | (string | number)[];
    loading?: boolean;
    onSearch: (value: string) => void;
    onSelect: (option: ComboBoxDropdownOption) => void;
}

const ComboBoxDropdown = forwardRef<ComboBoxDropdownHandle, ComboBoxDropdownProps>(function ComboBoxDropdown(
    {
        open,
        options,
        searchValue = '',
        searchPlaceholder = '',
        emptyState = '',
        multiple = false,
        selectedValues = [],
        loading = false,
        onSearch,
        onSelect,
    },
    ref,
) {
    const searchInputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({ focus: () => searchInputRef.current?.focus() }));

    const isSelected = (option: ComboBoxDropdownOption) =>
        Array.isArray(selectedValues) ? selectedValues.includes(option.value) : option.value === selectedValues;

    return (
        <div
            style={{ display: open ? undefined : 'none' }}
            className="absolute z-50 w-full mt-1 transition-opacity duration-200 border rounded-md shadow-lg bg-n-solid-1 border-n-strong"
        >
            <div className="relative border-b border-n-strong">
                {loading ? (
                    <Spinner size={16} className="absolute top-2.5 start-3 text-n-slate-11" />
                ) : (
                    <Icon icon="i-lucide-search" className="absolute top-2.5 size-4 start-3" />
                )}
                <input
                    ref={searchInputRef}
                    value={searchValue}
                    type="search"
                    placeholder={searchPlaceholder || t('COMBOBOX.SEARCH_PLACEHOLDER')}
                    className="reset-base w-full py-2 !ps-10 !pe-2 text-sm focus:outline-none border-none rounded-t-md bg-n-solid-1 text-n-slate-12"
                    onChange={event => onSearch(event.target.value)}
                />
            </div>
            <ul className="py-1 mb-0 overflow-auto max-h-60" role="listbox" aria-multiselectable={multiple}>
                {options.map((option, index) => (
                    <li
                        key={`${option.value}-${index}`}
                        className={`flex items-center justify-between w-full gap-2 px-3 py-2 text-sm transition-colors duration-150 cursor-pointer hover:bg-n-alpha-2 ${
                            isSelected(option) ? 'bg-n-alpha-2' : ''
                        }`}
                        role="option"
                        aria-selected={isSelected(option)}
                        onClick={event => {
                            event.stopPropagation();
                            onSelect(option);
                        }}
                    >
                        <span className={`text-n-slate-12 ${isSelected(option) ? 'font-medium' : ''}`}>
                            {option.label}
                        </span>
                        {isSelected(option) ? (
                            <span className="flex-shrink-0 i-lucide-check size-4 text-n-slate-11" />
                        ) : null}
                    </li>
                ))}
                {options.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-n-slate-11">{emptyState || t('COMBOBOX.EMPTY_STATE')}</li>
                ) : null}
            </ul>
        </div>
    );
});

export default ComboBoxDropdown;
