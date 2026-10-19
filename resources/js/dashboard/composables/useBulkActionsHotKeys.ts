import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
import { useEffect } from 'react';

import { clearCommandBarActions, setCommandBarActions } from 'dashboard/commands/commandBarStore';
import { SNOOZE_OPTIONS } from 'dashboard/constants/globals';
import { createSnoozeHandlers } from 'dashboard/helper/commandbar/actions';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import {
    CMD_BULK_ACTION_REOPEN_CONVERSATION,
    CMD_BULK_ACTION_RESOLVE_CONVERSATION,
    CMD_BULK_ACTION_SNOOZE_CONVERSATION,
} from 'dashboard/helper/commandbar/events';
import {
    ICON_REOPEN_CONVERSATION,
    ICON_RESOLVE_CONVERSATION,
    ICON_SNOOZE_CONVERSATION,
} from 'dashboard/helper/commandbar/icons';
import { emitter } from 'shared/helpers/emitter';
import { t } from '../../i18n';

// Port từ composables/commands/useBulkActionsHotKeys.js — nhóm lệnh chỉ xuất hiện
// khi đang chọn ít nhất một conversation, đăng ký vào commandBarStore (nguồn bulkActions).
const SOURCE = 'bulkActions';
const SECTION = 'COMMAND_BAR.SECTIONS.BULK_ACTIONS';

const BULK_ACTIONS: CommandBarAction[] = [
    {
        id: 'bulk_action_snooze_conversation',
        title: 'COMMAND_BAR.COMMANDS.SNOOZE_CONVERSATION',
        section: SECTION,
        icon: ICON_SNOOZE_CONVERSATION,
        children: Object.values(SNOOZE_OPTIONS),
    },
    ...createSnoozeHandlers(CMD_BULK_ACTION_SNOOZE_CONVERSATION, 'bulk_action_snooze_conversation', SECTION),
    {
        id: 'bulk_action_reopen_conversation',
        title: 'COMMAND_BAR.COMMANDS.REOPEN_CONVERSATION',
        section: SECTION,
        icon: ICON_REOPEN_CONVERSATION,
        handler: () => emitter.emit(CMD_BULK_ACTION_REOPEN_CONVERSATION),
    },
    {
        id: 'bulk_action_resolve_conversation',
        title: 'COMMAND_BAR.COMMANDS.RESOLVE_CONVERSATION',
        section: SECTION,
        icon: ICON_RESOLVE_CONVERSATION,
        handler: () => emitter.emit(CMD_BULK_ACTION_RESOLVE_CONVERSATION),
    },
];

export function useBulkActionsHotKeys(selectedCount: number): void {
    useEffect(() => {
        // Lệnh hàng loạt ở đây đều là đổi trạng thái hội thoại.
        if (!selectedCount || !isProductFeatureVisible('conversationStatus')) {
            clearCommandBarActions(SOURCE);
            return undefined;
        }

        setCommandBarActions(
            SOURCE,
            BULK_ACTIONS.map(action => ({ ...action, title: t(action.title), section: t(action.section) })),
        );

        return () => clearCommandBarActions(SOURCE);
    }, [selectedCount]);
}
