import { useEffect } from 'react';

import { updateColorScheme } from 'dashboard/helper/themeHelper';
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

const THEME_OPTIONS: { key: ColorScheme; titleKey: string; icon: string }[] = [
    { key: 'light', titleKey: 'COMMAND_BAR.COMMANDS.LIGHT_MODE', icon: ICON_LIGHT_MODE },
    { key: 'dark', titleKey: 'COMMAND_BAR.COMMANDS.DARK_MODE', icon: ICON_DARK_MODE },
    { key: 'auto', titleKey: 'COMMAND_BAR.COMMANDS.SYSTEM_MODE', icon: ICON_SYSTEM_MODE },
];

export function buildAppearanceActions(): CommandBarAction[] {
    const options: CommandBarAction[] = THEME_OPTIONS.map(theme => ({
        id: theme.key,
        title: t(theme.titleKey),
        parent: 'appearance_settings',
        section: t('COMMAND_BAR.SECTIONS.APPEARANCE'),
        icon: theme.icon,
        handler: () => updateColorScheme(theme.key),
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
