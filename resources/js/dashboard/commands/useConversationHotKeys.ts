import { useEffect } from 'react';

import { useConversation } from 'dashboard/conversation/ConversationContext';
import { STATUS_TYPE } from 'dashboard/conversation/constants';
import {
    MUTE_ACTION,
    OPEN_CONVERSATION_ACTIONS,
    RESOLVED_CONVERSATION_ACTIONS,
    SEND_TRANSCRIPT_ACTION,
    SNOOZE_CONVERSATION_ACTIONS,
    UNMUTE_ACTION,
} from 'dashboard/helper/commandbar/actions';
import type { CommandBarAction } from 'dashboard/helper/commandbar/actions';
import { t } from '../../i18n';
import { clearCommandBarActions, setCommandBarActions } from './commandBarStore';

const SOURCE = 'conversation';

const prepareActions = (actions: CommandBarAction[]): CommandBarAction[] =>
    actions.map(action => ({ ...action, title: t(action.title), section: t(action.section) }));

// Port từ composables/commands/useConversationHotKeys.js — B5 chỉ statusActions
// (resolve/snooze/reopen) + conversationAdditionalActions (mute/unmute/transcript).
// Assign agent/team/label/priority/macro/AI assist = B10. Gốc chỉ bật ở route
// conversation/inbox — hook này chỉ được gọi từ ConversationView nên tương đương.
export function useConversationHotKeys(): void {
    const { selectedConversation } = useConversation();
    const status = selectedConversation?.status;
    const muted = selectedConversation?.muted;

    useEffect(() => {
        if (!selectedConversation) {
            clearCommandBarActions(SOURCE);
            return undefined;
        }

        let statusActions: CommandBarAction[] = [];
        if (status === STATUS_TYPE.OPEN) {
            statusActions = [...OPEN_CONVERSATION_ACTIONS, ...SNOOZE_CONVERSATION_ACTIONS];
        } else if (status === STATUS_TYPE.RESOLVED || status === STATUS_TYPE.SNOOZED) {
            statusActions = RESOLVED_CONVERSATION_ACTIONS;
        }
        const additionalActions = [muted ? UNMUTE_ACTION : MUTE_ACTION, SEND_TRANSCRIPT_ACTION];

        setCommandBarActions(SOURCE, prepareActions([...statusActions, ...additionalActions]));

        return () => clearCommandBarActions(SOURCE);
        // Chỉ status/muted ảnh hưởng danh sách action.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [Boolean(selectedConversation), status, muted]);
}
