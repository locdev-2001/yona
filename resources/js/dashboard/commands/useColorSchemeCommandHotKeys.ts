import { useEffect } from 'react';

import { useAlert } from 'dashboard/composables/useAlert';
import { useColorScheme } from 'dashboard/composables/useColorScheme';
import type { ColorScheme } from 'dashboard/composables/useColorScheme';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import { ICON_APPEARANCE } from 'dashboard/helper/commandbar/icons';
import { t } from '../../i18n';
import { clearCommandBarActions, setCommandBarActions } from './commandBarStore';

const SOURCE = 'color_scheme';
const PARENT_ID = 'change_color_scheme';

// Ctrl+K → "Đổi chế độ màu" mở nhánh con Sáng / Tối / Theo hệ thống, cùng lựa chọn
// và cùng cách lưu với hàng Giao diện ở menu avatar.
export function buildColorSchemeActions(
    options: { value: ColorScheme; label: string }[],
    changeColorScheme: (scheme: ColorScheme) => Promise<void>,
): CommandBarAction[] {
    const childId = (scheme: ColorScheme) => `${PARENT_ID}_${scheme}`;
    const appearanceLabel = t('SIDEBAR_ITEMS.APPEARANCE');

    return [
        {
            id: PARENT_ID,
            title: t('COMMAND_BAR.COMMANDS.CHANGE_APPEARANCE'),
            section: t('COMMAND_BAR.SECTIONS.GENERAL'),
            icon: ICON_APPEARANCE,
            keywords: [appearanceLabel, 'dark mode light mode', ...options.map(option => option.label)].join(' '),
            children: options.map(option => childId(option.value)),
        },
        ...options.map(option => ({
            id: childId(option.value),
            title: option.label,
            section: appearanceLabel,
            parent: PARENT_ID,
            icon: ICON_APPEARANCE,
            handler: () => {
                changeColorScheme(option.value).catch(() =>
                    useAlert(t('PROFILE_SETTINGS.FORM.INTERFACE_SECTION.COLOR_SCHEME.UPDATE_ERROR')),
                );
            },
        })),
    ];
}

export function useColorSchemeCommandHotKeys(): void {
    const { colorScheme, options, changeColorScheme } = useColorScheme();

    useEffect(() => {
        setCommandBarActions(SOURCE, buildColorSchemeActions(options, changeColorScheme));
        return () => clearCommandBarActions(SOURCE);
        // options/changeColorScheme dựng lại mỗi render; chỉ cần dựng lại khi chế độ đổi.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [colorScheme]);
}
