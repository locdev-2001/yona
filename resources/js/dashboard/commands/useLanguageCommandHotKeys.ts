import { useEffect } from 'react';

import { useAlert } from 'dashboard/composables/useAlert';
import { useInterfaceLocale } from 'dashboard/composables/useInterfaceLocale';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import { ICON_LANGUAGES } from 'dashboard/helper/commandbar/icons';
import type { AvailableLocale } from '../../types';
import { t } from '../../i18n';
import { clearCommandBarActions, setCommandBarActions } from './commandBarStore';

const SOURCE = 'language';
const PARENT_ID = 'change_interface_language';
const ACCOUNT_DEFAULT = '';

// Ctrl+K → "Đổi ngôn ngữ giao diện" mở nhánh con liệt kê ngôn ngữ, cùng lựa chọn
// và cùng cách lưu với hàng Ngôn ngữ ở menu avatar.
export function buildLanguageActions(
    availableLocales: AvailableLocale[],
    changeLocale: (locale: string) => Promise<void>,
): CommandBarAction[] {
    const options = [
        { value: ACCOUNT_DEFAULT, label: t('SIDEBAR_ITEMS.LANGUAGE_ACCOUNT_DEFAULT') },
        ...availableLocales.map(locale => ({ value: locale.iso_639_1_code, label: locale.name })),
    ];
    const childId = (value: string) => `${PARENT_ID}_${value || 'account_default'}`;
    const languageLabel = t('SIDEBAR_ITEMS.LANGUAGE');

    return [
        {
            id: PARENT_ID,
            title: t('COMMAND_BAR.COMMANDS.CHANGE_LANGUAGE'),
            section: t('COMMAND_BAR.SECTIONS.GENERAL'),
            icon: ICON_LANGUAGES,
            keywords: [languageLabel, ...options.map(option => option.label)].join(' '),
            children: options.map(option => childId(option.value)),
        },
        ...options.map(option => ({
            id: childId(option.value),
            title: option.label,
            section: languageLabel,
            parent: PARENT_ID,
            icon: ICON_LANGUAGES,
            handler: () => {
                changeLocale(option.value).catch(() =>
                    useAlert(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.LANGUAGE.UPDATE_ERROR')),
                );
            },
        })),
    ];
}

export function useLanguageCommandHotKeys(): void {
    const { availableLocales, changeLocale } = useInterfaceLocale();

    useEffect(() => {
        setCommandBarActions(SOURCE, buildLanguageActions(availableLocales, changeLocale));
        return () => clearCommandBarActions(SOURCE);
    }, [availableLocales, changeLocale]);
}
