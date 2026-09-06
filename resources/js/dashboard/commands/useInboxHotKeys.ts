import { useEffect } from 'react';

import { SNOOZE_OPTIONS } from 'dashboard/constants/globals';
import { createSnoozeHandlers } from 'dashboard/helper/commandbar/actions';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import { CMD_SNOOZE_NOTIFICATION } from 'dashboard/helper/commandbar/events';
import { ICON_SNOOZE_NOTIFICATION } from 'dashboard/helper/commandbar/icons';
import { t } from '../../i18n';
import { clearCommandBarActions, setCommandBarActions } from './commandBarStore';

const SOURCE = 'inbox';

// Port từ composables/commands/useInboxHotKeys.js — chỉ đăng ký khi đang ở
// trang inbox-view (gốc kiểm bằng isAInboxViewRoute).
const INBOX_SNOOZE_ACTIONS: CommandBarAction[] = [
    {
        id: 'snooze_notification',
        title: 'COMMAND_BAR.COMMANDS.SNOOZE_NOTIFICATION',
        // Nhánh cha của bản gốc không có section.
        section: '',
        icon: ICON_SNOOZE_NOTIFICATION,
        children: Object.values(SNOOZE_OPTIONS),
    },
    ...createSnoozeHandlers(
        CMD_SNOOZE_NOTIFICATION,
        'snooze_notification',
        'COMMAND_BAR.SECTIONS.SNOOZE_NOTIFICATION',
    ).map(action => ({ ...action, icon: ICON_SNOOZE_NOTIFICATION })),
];

export function useInboxHotKeys(): void {
    useEffect(() => {
        setCommandBarActions(
            SOURCE,
            INBOX_SNOOZE_ACTIONS.map(action => ({
                ...action,
                title: t(action.title),
                section: action.section ? t(action.section) : undefined,
            })) as CommandBarAction[],
        );

        return () => clearCommandBarActions(SOURCE);
    }, []);
}
