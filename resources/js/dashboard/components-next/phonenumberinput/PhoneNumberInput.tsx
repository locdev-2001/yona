import { useEffect, useRef, useState } from 'react';
import parsePhoneNumber from 'libphonenumber-js';

import { t } from '../../../i18n';
import countries from 'shared/constants/countries';
import { getActiveCountryCode, getActiveDialCode } from 'shared/components/PhoneInput/helper';
import Input from 'dashboard/components-next/input/Input';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import type { DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { composePhoneNumber, isTypedPhoneNumberValid } from './phoneNumberValue';

// Port từ dashboard/components-next/phonenumberinput/PhoneNumberInput.vue.
interface PhoneNumberInputProps {
    value: string;
    placeholder?: string;
    disabled?: boolean;
    showBorder?: boolean;
    onChange: (value: string) => void;
}

const ERROR_OUTLINE = 'outline-n-ruby-8 hover:outline-n-ruby-9';
const FOCUS_OUTLINE = 'has-[:focus]:outline-n-brand';

export default function PhoneNumberInput({
    value,
    placeholder = '',
    disabled = false,
    showBorder = true,
    onChange,
}: PhoneNumberInputProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [activeCountryCode, setActiveCountryCode] = useState(getActiveCountryCode);
    const [activeDialCode, setActiveDialCode] = useState(getActiveDialCode);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [isDirty, setDirty] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    // Giá trị vừa phát ra từ chính ô này — không tách ngược lại kẻo xoá mất cách
    // người dùng đang gõ (khoảng trắng, số 0 đầu).
    const lastEmittedRef = useRef<string | null>(null);

    useEffect(() => {
        if (value === lastEmittedRef.current) return;
        const parsed = value ? parsePhoneNumber(value) : undefined;
        if (parsed) {
            if (parsed.country) setActiveCountryCode(parsed.country);
            if (parsed.countryCallingCode) setActiveDialCode(`+${parsed.countryCallingCode}`);
            setPhoneNumber(value.replace(`+${parsed.countryCallingCode}`, ''));
        }
    }, [value]);

    useEffect(() => {
        if (!showDropdown) return undefined;

        const handleClickAway = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) setShowDropdown(false);
        };
        document.addEventListener('mousedown', handleClickAway);

        return () => document.removeEventListener('mousedown', handleClickAway);
    }, [showDropdown]);

    const isPhoneNumberInvalid = !isTypedPhoneNumberValid(phoneNumber);
    const hasError = isPhoneNumberInvalid;

    const activeCountry = activeCountryCode
        ? countries.find(country => country.id === activeCountryCode)
        : undefined;

    const countryMenuItems: DropdownMenuItem[] = countries.map(country => ({
        value: country.id,
        label: country.name,
        dialCode: country.dial_code,
        emoji: country.emoji,
        isSelected: String(activeCountryCode) === String(country.id),
        action: 'phoneNumberInput',
    }));

    // Chưa chọn được mã nước thì gửi nguyên số — máy chủ hiểu theo quốc gia mặc định.
    const emitPhoneNumber = (dialCode: string, newNumber: string) => {
        const isKnownDialCode = countries.some(country => country.dial_code === dialCode);
        const composed = composePhoneNumber(isKnownDialCode ? dialCode : null, newNumber);
        lastEmittedRef.current = composed;
        onChange(composed);
    };

    const handleNumberInput = (newNumber: string) => {
        setPhoneNumber(newNumber);
        setDirty(true);

        if (isTypedPhoneNumberValid(newNumber)) {
            emitPhoneNumber(activeDialCode, newNumber);
        }
    };

    const onSelectCountry = (item: DropdownMenuItem) => {
        setActiveCountryCode(String(item.value));
        setActiveDialCode(String(item.dialCode));
        setShowDropdown(false);
        if (!hasError && phoneNumber) {
            emitPhoneNumber(String(item.dialCode), phoneNumber);
        }
    };

    const inputBorderClass = !showBorder
        ? hasError
            ? ERROR_OUTLINE
            : `outline-transparent ${FOCUS_OUTLINE}`
        : hasError
          ? ERROR_OUTLINE
          : `${FOCUS_OUTLINE} outline-n-weak hover:outline-n-slate-6`;

    const phoneNumberError = isDirty && isPhoneNumberInvalid ? t('PHONE_INPUT.ERROR') : '';

    return (
        <div>
            <div
                ref={rootRef}
                className={`relative flex items-center h-8 transition-all duration-500 ease-in-out outline outline-1 outline-offset-[-1px] rounded-lg bg-n-alpha-black2 ${inputBorderClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`.trim()}
            >
                <Input
                    value={phoneNumber}
                    type="tel"
                    placeholder={placeholder}
                    disabled={disabled}
                    customInputClass="!border-0 !outline-none h-8 !py-0.5 !bg-transparent ltr:!pl-1 rtl:!pr-1"
                    className="w-full !flex-row"
                    onChange={event => handleNumberInput(event.target.value)}
                    prefix={
                        <div className="flex items-center flex-shrink-0">
                            <Button
                                label={activeCountry?.emoji || ''}
                                color="slate"
                                size="sm"
                                icon={!activeCountry ? 'i-lucide-globe' : 'i-lucide-chevron-down'}
                                trailingIcon
                                disabled={disabled}
                                type="button"
                                className="!h-[1.875rem] top-1 ltr:ml-px rtl:mr-px !px-2 outline-0 !outline-none !rounded-lg border-0 ltr:!rounded-r-none rtl:!rounded-l-none"
                                onClick={() => setShowDropdown(open => !open)}
                            />
                            {activeCountry ? (
                                <span className="text-sm left-[38px] top-2.5 text-n-slate-11 ltr:!pl-1 rtl:!pr-1">
                                    {activeDialCode}
                                </span>
                            ) : null}
                        </div>
                    }
                />
                {showDropdown ? (
                    <DropdownMenu
                        menuItems={countryMenuItems}
                        showSearch
                        className="z-[100] w-48 mt-2 ltr:left-0 rtl:right-0 top-full max-h-52"
                        onAction={onSelectCountry}
                    />
                ) : null}
            </div>
            {phoneNumberError ? (
                <p className="min-w-0 mt-1 mb-0 text-xs truncate transition-all duration-500 ease-in-out text-n-ruby-9">
                    {phoneNumberError}
                </p>
            ) : null}
        </div>
    );
}
