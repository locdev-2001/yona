import { useState } from 'react';
import type { ReactNode } from 'react';
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
import { DROPDOWN_SEARCH_THRESHOLD } from '../helper/filterHelper';

// Port từ components-next/filter/inputs/FilterSelect.vue — chọn 1 giá trị
// (attribute / operator / AND-OR); header nhóm là option `disabled`.
export interface FilterSelectOption {
    value: string;
    label: string;
    icon?: ReactNode;
    disabled?: boolean;
}

interface FilterSelectProps {
    options?: FilterSelectOption[];
    value: string;
    onChange: (value: string) => void;
    hideLabel?: boolean;
    hideIcon?: boolean;
    variant?: 'faded' | 'ghost' | 'solid' | 'outline' | 'link';
    label?: string | null;
    className?: string;
}

function SearchInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    return (
        <div className="relative">
            <Icon className="absolute size-4 left-2 top-2" icon="i-lucide-search" />
            <input
                ref={focusOnMount}
                value={value}
                onChange={event => onChange(event.target.value)}
                className="w-full p-1.5 pl-8 rounded-lg text-n-slate-11 bg-n-alpha-1"
                placeholder={t('COMBOBOX.SEARCH_PLACEHOLDER')}
            />
        </div>
    );
}

export default function FilterSelect({
    options = [],
    value,
    onChange,
    hideLabel = false,
    hideIcon = false,
    variant = 'faded',
    label = null,
    className = '',
}: FilterSelectProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const showSearch = options.length > DROPDOWN_SEARCH_THRESHOLD;

    const query = searchTerm.trim();
    const searchResults = query
        ? picoSearch(
              options.filter(option => !option.disabled),
              query,
              ['label'],
          )
        : options;

    const selectedOption = options.find(option => option.value === value);
    const iconToRender = hideIcon ? undefined : (selectedOption?.icon ?? 'i-lucide-chevron-down');

    return (
        <DropdownContainer
            className={className}
            menu={
                <DropdownBody className="min-w-56 z-50 top-0" strong>
                    {showSearch ? <SearchInput value={searchTerm} onChange={setSearchTerm} /> : null}
                    <DropdownSection className="[&>ul]:max-h-72">
                        {searchResults.map(option =>
                            option.disabled ? (
                                <li key={option.value} className="px-2 py-1.5 text-xs font-medium text-n-slate-10 select-none">
                                    {option.label}
                                </li>
                            ) : (
                                <DropdownItem
                                    key={option.value}
                                    label={option.label}
                                    icon={option.icon}
                                    onClick={() => onChange(option.value)}
                                />
                            ),
                        )}
                        {!searchResults.length ? (
                            <DropdownItem disabled>
                                {searchTerm
                                    ? t('COMBOBOX.EMPTY_SEARCH_RESULTS', { searchTerm })
                                    : t('COMBOBOX.EMPTY_STATE')}
                            </DropdownItem>
                        ) : null}
                    </DropdownSection>
                </DropdownBody>
            }
        >
            {({ toggle }) => (
                <Button
                    type="button"
                    sm
                    slate
                    variant={variant}
                    icon={iconToRender}
                    trailingIcon={!selectedOption?.icon}
                    label={label ?? (hideLabel ? undefined : selectedOption?.label)}
                    onClick={() => {
                        setSearchTerm('');
                        toggle();
                    }}
                />
            )}
        </DropdownContainer>
    );
}
