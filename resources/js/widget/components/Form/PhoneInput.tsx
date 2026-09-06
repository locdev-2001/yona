import { useEffect, useMemo, useRef, useState } from 'react';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import countriesList from 'shared/constants/countries';
import type { Country } from 'shared/constants/countries';
import { getActiveCountryCode, getActiveDialCode } from 'shared/components/PhoneInput/helper';

import { t } from '../../i18n';

// Port từ widget/components/Form/PhoneInput.vue — ô nhập điện thoại của form
// tiền chat. Giá trị đẩy lên là `${dialCode}${số}` như `setContextValue` gốc.
interface PhoneInputProps {
    placeholder?: string;
    hasError: boolean;
    onChange: (value: string) => void;
    onBlur: () => void;
}

export default function PhoneInput({ placeholder = '', hasError, onChange, onBlur }: PhoneInputProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [searchCountry, setSearchCountry] = useState('');
    const [activeCountryCode, setActiveCountryCode] = useState(getActiveCountryCode);
    const [activeDialCode, setActiveDialCode] = useState(getActiveDialCode);
    const [phoneNumber, setPhoneNumber] = useState('');

    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchbarRef = useRef<HTMLInputElement>(null);

    const dropdownFirstItemName = activeCountryCode ? 'Clear selection' : 'Select Country';
    const countries: Country[] = useMemo(
        () => [{ name: dropdownFirstItemName, dial_code: '', emoji: '', id: '' }, ...countriesList],
        [dropdownFirstItemName],
    );

    const items = useMemo(() => {
        const search = searchCountry.toLowerCase();

        return countries.filter(
            country =>
                country.name.toLowerCase().includes(search) ||
                country.dial_code.toLowerCase().includes(search) ||
                country.id.toLowerCase().includes(search),
        );
    }, [countries, searchCountry]);

    const activeCountry = countries.find(country => country.id === activeCountryCode);

    useEffect(() => {
        if (items.length < selectedIndex + 1) setSelectedIndex(0);
    }, [items, selectedIndex]);

    // v-on-clickaway của bản gốc.
    useEffect(() => {
        if (!showDropdown) return undefined;
        const onClickAway = (event: MouseEvent) => {
            if (!dropdownRef.current?.contains(event.target as Node)) closeDropdown();
        };
        document.addEventListener('click', onClickAway);

        return () => document.removeEventListener('click', onClickAway);
    }, [showDropdown]);

    const closeDropdown = () => {
        setSelectedIndex(-1);
        setShowDropdown(false);
    };

    const emitValue = (dialCode: string, number: string) => onChange(`${dialCode}${number}`);

    const onSelectCountry = (country: Country) => {
        setActiveCountryCode(country.id);
        setSearchCountry('');
        setActiveDialCode(country.dial_code || '');
        emitValue(country.dial_code || '', phoneNumber);
        closeDropdown();
    };

    const toggleCountryDropdown = () => {
        const next = !showDropdown;
        setShowDropdown(next);
        setSelectedIndex(-1);
        if (next) window.setTimeout(() => searchbarRef.current?.focus(), 0);
    };

    const adjustSelection = (direction: 'up' | 'down') => {
        if (!showDropdown) return;
        const maxIndex = items.length - 1;
        setSelectedIndex(current => {
            if (direction === 'up') return current <= 0 ? maxIndex : current - 1;

            return current >= maxIndex ? 0 : current + 1;
        });
    };

    return (
        <div className="relative mt-2 phone-input--wrap">
            <div
                className={`flex items-center justify-start outline-none phone-input rounded-lg box-border bg-n-background dark:bg-n-alpha-2 border-none outline outline-1 outline-offset-[-1px] text-sm w-full text-n-slate-12 focus-within:outline-n-brand focus-within:ring-1 focus-within:ring-n-brand ${
                    hasError
                        ? 'outline-n-ruby-8 dark:outline-n-ruby-8 hover:outline-n-ruby-9 dark:hover:outline-n-ruby-9'
                        : 'outline-n-weak'
                }`}
            >
                <div
                    className="flex items-center justify-between h-[2.625rem] px-2 py-2 cursor-pointer bg-n-alpha-1 dark:bg-n-solid-1 ltr:rounded-bl-lg rtl:rounded-br-lg ltr:rounded-tl-lg rtl:rounded-tr-lg min-w-[3.6rem] w-[3.6rem]"
                    onClick={toggleCountryDropdown}
                >
                    {activeCountry?.emoji ? (
                        <h5 className="mb-0 text-xl">{activeCountry.emoji}</h5>
                    ) : (
                        <FluentIcon icon="globe" className="fluent-icon" size="20" />
                    )}
                    <FluentIcon icon="chevron-down" className="fluent-icon" size="12" />
                </div>
                {activeDialCode ? (
                    <span className="py-2 ltr:pl-2 rtl:pr-2 text-base text-n-slate-11">{activeDialCode}</span>
                ) : null}
                <input
                    value={phoneNumber}
                    type="phoneInput"
                    className="w-full h-full !py-3 pl-2 pr-3 leading-tight rounded-r !outline-none focus:!ring-0 !bg-transparent dark:!bg-transparent"
                    name="phoneNumber"
                    placeholder={placeholder}
                    onChange={event => {
                        setPhoneNumber(event.target.value);
                        emitValue(activeDialCode, event.target.value);
                    }}
                    onBlur={onBlur}
                />
            </div>
            {showDropdown ? (
                <div
                    ref={dropdownRef}
                    className="country-dropdown absolute bg-n-background text-n-slate-12 dark:bg-n-solid-3 z-10 h-48 px-0 pt-0 pb-1 pl-1 pr-1 overflow-y-auto rounded-lg shadow-lg top-12 w-full min-w-24 max-w-[14.8rem]"
                    onKeyDown={event => {
                        if (event.key === 'ArrowUp') adjustSelection('up');
                        if (event.key === 'ArrowDown') adjustSelection('down');
                        if (event.key === 'Enter' && selectedIndex !== -1) onSelectCountry(items[selectedIndex]);
                    }}
                >
                    <div className="sticky top-0 bg-n-background text-n-slate-12 dark:bg-n-solid-3">
                        <input
                            ref={searchbarRef}
                            value={searchCountry}
                            type="text"
                            placeholder={t('PRE_CHAT_FORM.FIELDS.PHONE_NUMBER.DROPDOWN_SEARCH')}
                            className="w-full h-8 !ring-0 px-3 py-2 mt-1 mb-1 text-sm rounded bg-n-alpha-black2"
                            onChange={event => setSearchCountry(event.target.value)}
                        />
                    </div>
                    {items.map((country, index) => (
                        <div
                            key={index}
                            className={[
                                'flex items-center h-8 px-2 py-2 rounded cursor-pointer country-dropdown--item text-n-slate-12 dark:hover:bg-n-solid-2 hover:bg-n-alpha-2',
                                country.id === activeCountryCode ? 'active bg-n-alpha-1 dark:bg-n-solid-1' : '',
                                index === selectedIndex ? 'focus dark:bg-n-solid-2 bg-n-alpha-2' : '',
                            ]
                                .filter(Boolean)
                                .join(' ')}
                            onClick={() => onSelectCountry(country)}
                        >
                            {country.emoji ? <span className="mr-2 text-xl">{country.emoji}</span> : null}
                            <span className="text-sm leading-5 truncate">{country.name}</span>
                            <span className="ml-2 text-xs">{country.dial_code}</span>
                        </div>
                    ))}
                    {items.length === 0 ? (
                        <div>
                            <span className="flex justify-center mt-4 text-sm text-center text-n-slate-11">
                                {t('PRE_CHAT_FORM.FIELDS.PHONE_NUMBER.DROPDOWN_EMPTY')}
                            </span>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
