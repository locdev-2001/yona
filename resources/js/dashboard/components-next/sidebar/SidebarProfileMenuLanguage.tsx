import { useState } from 'react';

import { t } from '../../../i18n';
import { useAlert } from 'dashboard/composables/useAlert';
import { useInterfaceLocale } from 'dashboard/composables/useInterfaceLocale';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import { DropdownBody, DropdownContainer, DropdownItem } from 'dashboard/components-next/dropdown-menu/base';

const ACCOUNT_DEFAULT = '';

// Hàng "Ngôn ngữ" trong menu avatar: đổi ngôn ngữ giao diện của riêng mình,
// không đụng ngôn ngữ của tài khoản (chỉnh ở màn Widget chat).
export default function SidebarProfileMenuLanguage() {
    const { availableLocales, personalLocale, changeLocale } = useInterfaceLocale();
    const [isSaving, setSaving] = useState(false);

    const options = [
        { value: ACCOUNT_DEFAULT, label: t('SIDEBAR_ITEMS.LANGUAGE_ACCOUNT_DEFAULT') },
        ...availableLocales.map(locale => ({ value: locale.iso_639_1_code, label: locale.name })),
    ];
    const activeOption = options.find(option => option.value === personalLocale) ?? options[0];

    const selectLocale = async (locale: string) => {
        if (isSaving || locale === personalLocale) return;
        setSaving(true);
        try {
            await changeLocale(locale);
        } catch {
            useAlert(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.UPDATE_ERROR'));
            setSaving(false);
        }
    };

    return (
        <DropdownItem preserveOpen className="gap-1">
            <div className="flex-grow flex items-center gap-2 min-w-0">
                <Icon icon="i-lucide-languages" className="size-4 text-n-slate-11" />
                {t('SIDEBAR_ITEMS.LANGUAGE')}
            </div>
            <DropdownContainer
                className="shrink-0"
                menu={
                    <DropdownBody className="min-w-40 z-20">
                        {options.map(option => (
                            <DropdownItem
                                key={option.value || 'account-default'}
                                label={option.label}
                                iconSlot={
                                    <Icon
                                        icon="i-lucide-check"
                                        className={`size-4 ${option.value === activeOption.value ? 'text-n-slate-12' : 'invisible'}`}
                                    />
                                }
                                className="cursor-pointer"
                                onClick={() => void selectLocale(option.value)}
                            />
                        ))}
                    </DropdownBody>
                }
            >
                {({ toggle }) => (
                    <Button
                        size="sm"
                        color="slate"
                        variant="faded"
                        icon="i-lucide-chevron-down"
                        trailingIcon
                        type="button"
                        disabled={isSaving}
                        aria-label={`${t('SIDEBAR_ITEMS.LANGUAGE')}: ${activeOption.label}`}
                        onClick={toggle}
                    >
                        <span className="truncate max-w-[7rem] text-sm">{activeOption.label}</span>
                    </Button>
                )}
            </DropdownContainer>
        </DropdownItem>
    );
}
