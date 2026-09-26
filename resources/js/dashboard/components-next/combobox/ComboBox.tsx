import { useEffect, useRef, useState } from 'react';

import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/components-next/combobox/ComboBox.vue + ComboBoxDropdown.vue
// (bỏ nhánh useApiResults — chưa màn nào port cần search qua API).
export interface ComboBoxOption {
    value: string;
    label: string;
}

interface ComboBoxProps {
    options: ComboBoxOption[];
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    searchPlaceholder?: string;
    emptyState?: string;
    message?: string;
    hasError?: boolean;
    className?: string;
    // useApiResults của gốc: options do caller nạp theo query (không lọc cục bộ).
    useApiResults?: boolean;
    onSearch?: (query: string) => void;
    onChange: (value: string) => void;
}

export default function ComboBox({
    options,
    placeholder = '',
    value = '',
    disabled = false,
    searchPlaceholder = '',
    emptyState = '',
    message = '',
    hasError = false,
    className = '',
    useApiResults = false,
    onSearch,
    onChange,
}: ComboBoxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!open) return undefined;

        searchInputRef.current?.focus();

        const handleClickAway = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [open]);

    const searchTerm = search.toLowerCase();
    const filteredOptions = useApiResults
        ? options
        : options.filter(option => option.label.toLowerCase().includes(searchTerm));

    const selectPlaceholder = placeholder || t('COMBOBOX.PLACEHOLDER');
    const selectedLabel = options.find(option => option.value === value)?.label ?? selectPlaceholder;

    const selectOption = (option: ComboBoxOption) => {
        onChange(value === option.value ? '' : option.value);
        setOpen(false);
        setSearch('');
    };

    const toggleDropdown = () => {
        if (disabled) return;
        setOpen(current => {
            if (!current) setSearch('');
            return !current;
        });
    };

    return (
        <div
            ref={rootRef}
            className={`relative w-full min-w-0 ${disabled ? 'cursor-not-allowed' : 'group/combobox'} ${className}`.trim()}
        >
            {/* Wrapper div bắt buộc: bản gốc bọc trong <OnClickOutside> (@vueuse) —
                render ra một <div> thật, nên DOM là root > div > button và caller
                nhắm selector [&>div>button]:... (vd ContactsForm ép h-8 + nền).
                Bỏ lớp div này là selector của caller trượt (bẫy cùng họ TabBar). */}
            <div>
                <Button
                variant="outline"
                color={hasError && !open ? 'ruby' : open ? 'blue' : 'slate'}
                label={selectedLabel}
                trailingIcon
                disabled={disabled}
                noAnimation
                type="button"
                className={[
                    'justify-between w-full !px-3 !py-2.5 text-n-slate-12 font-normal group-hover/combobox:border-n-slate-6 focus:outline-n-brand',
                    open ? 'focused' : '',
                    !hasError
                        ? '[&:not(.focused)]:hover:enabled:outline-n-slate-6'
                        : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                icon={open ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'}
                onClick={toggleDropdown}
            />

            {open ? (
                <div className="absolute z-50 w-full mt-1 transition-opacity duration-200 border rounded-md shadow-lg bg-n-solid-1 border-n-strong">
                    <div className="relative border-b border-n-strong">
                        <Icon icon="i-lucide-search" className="absolute top-2.5 size-4 start-3" />
                        <input
                            ref={searchInputRef}
                            value={search}
                            type="search"
                            placeholder={searchPlaceholder || t('COMBOBOX.SEARCH_PLACEHOLDER')}
                            className="reset-base w-full py-2 !ps-10 !pe-2 text-sm focus:outline-none border-none rounded-t-md bg-n-solid-1 text-n-slate-12"
                            onChange={event => {
                                setSearch(event.target.value);
                                onSearch?.(event.target.value);
                            }}
                        />
                    </div>
                    <ul className="py-1 mb-0 overflow-auto max-h-60" role="listbox">
                        {filteredOptions.map((option, index) => {
                            const isSelected = option.value === value;

                            return (
                                <li
                                    key={`${option.value}-${index}`}
                                    className={`flex items-center justify-between w-full gap-2 px-3 py-2 text-sm transition-colors duration-150 cursor-pointer hover:bg-n-alpha-2 ${isSelected ? 'bg-n-alpha-2' : ''}`.trim()}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={event => {
                                        event.stopPropagation();
                                        selectOption(option);
                                    }}
                                >
                                    <span className={`text-n-slate-12 ${isSelected ? 'font-medium' : ''}`.trim()}>
                                        {option.label}
                                    </span>
                                    {isSelected ? (
                                        <span className="flex-shrink-0 i-lucide-check size-4 text-n-slate-11" />
                                    ) : null}
                                </li>
                            );
                        })}
                        {filteredOptions.length === 0 ? (
                            <li className="px-3 py-2 text-sm text-n-slate-11">
                                {emptyState || t('COMBOBOX.EMPTY_STATE')}
                            </li>
                        ) : null}
                    </ul>
                </div>
            ) : null}

            {message ? (
                <p
                    className={`mt-2 mb-0 text-xs truncate transition-all duration-500 ease-in-out ${hasError ? 'text-n-ruby-9' : 'text-n-slate-11'}`}
                >
                    {message}
                </p>
            ) : null}
            </div>
        </div>
    );
}
