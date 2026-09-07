import { useEffect } from 'react';

import { COLOR_SCHEME_OPTIONS, updateColorScheme } from 'dashboard/helper/themeHelper';
import type { ColorScheme } from 'dashboard/helper/themeHelper';
import {
    ICON_APPEARANCE,
    ICON_DARK_MODE,
    ICON_LIGHT_MODE,
    ICON_SYSTEM_MODE,
} from 'dashboard/helper/commandbar/icons';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import { t } from '../../i18n';
import { clearCommandBarActions, setCommandBarActions } from './commandBarStore';

// Port từ composables/commands/useAppearanceHotKeys.js — nhánh `appearance_settings`
// đổi giao diện sáng/tối/hệ thống. LocalStorage + setColorTheme của gốc đã nằm
// trong helper/themeHelper.updateColorScheme.

const SOURCE = 'appearance';

// Nhãn đến từ COLOR_SCHEME_OPTIONS (themeHelper); ở đây chỉ thêm icon của ninja-keys.
const THEME_ICONS: Record<ColorScheme, string> = {
    light: ICON_LIGHT_MODE,
    dark: ICON_DARK_MODE,
    auto: ICON_SYSTEM_MODE,
};

export function buildAppearanceActions(): CommandBarAction[] {
    const options: CommandBarAction[] = COLOR_SCHEME_OPTIONS.map(theme => ({
        id: theme.scheme,
        title: t(theme.titleKey),
        parent: 'appearance_settings',
        section: t('COMMAND_BAR.SECTIONS.APPEARANCE'),
        icon: THEME_ICONS[theme.scheme],
        handler: () => updateColorScheme(theme.scheme),
    }));

    return [
        {
            id: 'appearance_settings',
            title: t('COMMAND_BAR.COMMANDS.CHANGE_APPEARANCE'),
            section: t('COMMAND_BAR.SECTIONS.APPEARANCE'),
            icon: ICON_APPEARANCE,
            children: options.map(option => option.id),
        },
        ...options,
    ];
}

export function useAppearanceHotKeys(): void {
    useEffect(() => {
        setCommandBarActions(SOURCE, buildAppearanceActions());
        return () => clearCommandBarActions(SOURCE);
    }, []);
}
