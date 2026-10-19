import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { isProductFeatureVisible } from 'shared/helpers/productVisibility';

import { useConversation } from 'dashboard/conversation/ConversationContext';
import { orderMacros } from 'dashboard/conversation/macros/useOrderedMacros';
import { runMacro } from 'dashboard/conversation/macros/useMacroExecution';
import { ICON_TOY_BRICK } from 'dashboard/helper/commandbar/icons';
import { fetchMacros, useMacrosSnapshot } from 'dashboard/settings/macros/macrosStore';
import { t } from '../../i18n';
import type { DashboardPageProps } from '../types';
import { clearCommandBarActions, setCommandBarActions } from './commandBarStore';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';

const SOURCE = 'macros';

// Port từ composables/commands/useMacroHotKeys.js. Hook chỉ được gọi từ
// ConversationView nên điều kiện route của gốc (isAConversationRoute /
// isAInboxViewRoute) đã thoả sẵn; còn lại là cờ tính năng `macros`.
export function useMacroHotKeys(): void {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const isMacrosAvailable = Boolean(currentAccount.features.macros) && isProductFeatureVisible('macros');

    const { selectedConversation, uiSettings } = useConversation();
    const { records } = useMacrosSnapshot();
    const conversationId = selectedConversation?.id ?? 0;

    useEffect(() => {
        if (isMacrosAvailable) fetchMacros(accountId);
    }, [isMacrosAvailable, accountId]);

    const macros = isMacrosAvailable ? orderMacros(records, uiSettings) : [];
    const macrosKey = macros.map(macro => macro.id).join('|');

    useEffect(() => {
        if (!macros.length || !conversationId) {
            clearCommandBarActions(SOURCE);
            return undefined;
        }

        const options: CommandBarAction[] = macros.map(macro => ({
            id: `macro-${macro.id}`,
            title: macro.name,
            parent: 'execute_a_macro',
            section: t('COMMAND_BAR.SECTIONS.EXECUTE_MACRO'),
            icon: ICON_TOY_BRICK,
            handler: () => void runMacro(accountId, macro, conversationId),
        }));

        setCommandBarActions(SOURCE, [
            {
                id: 'execute_a_macro',
                title: t('COMMAND_BAR.COMMANDS.EXECUTE_A_MACRO'),
                section: t('COMMAND_BAR.SECTIONS.CONVERSATION'),
                icon: ICON_TOY_BRICK,
                children: options.map(option => option.id),
            },
            ...options,
        ]);

        return () => clearCommandBarActions(SOURCE);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [macrosKey, conversationId, accountId]);
}
