import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useAlert } from 'dashboard/composables/useAlert';
import { processBulkAction } from 'dashboard/conversation/bulkApi';
import type { BulkActionAgent, BulkActionPayload, BulkActionTeam } from 'dashboard/conversation/bulkApi';
import type { Conversation, ConversationStatus } from 'dashboard/conversation/types';
import { t } from '../../i18n';

// Port từ composables/chatlist/useBulkActions.js + store/modules/bulkActions.js.
// Store vuex `bulkActions` là toàn cục nhưng chỉ ChatList dùng → giữ state cục bộ
// trong ChatList (context bên dưới thay cho provide/inject của gốc).
// Bỏ: nhánh required attributes khi resolve (EE, đã bỏ ở B5); nhãn (B7).

export interface BulkSelection {
    // `selectedConversationIds` gốc — không trùng.
    ids: number[];
    // `selectedInboxes` gốc — MỘT phần tử cho mỗi conversation đã chọn (có thể trùng).
    inboxIds: number[];
}

export const EMPTY_SELECTION: BulkSelection = { ids: [], inboxIds: [] };

export function addToSelection(selection: BulkSelection, conversationId: number, inboxId: number): BulkSelection {
    return {
        ids: [...new Set([...selection.ids, conversationId])],
        inboxIds: [...selection.inboxIds, inboxId],
    };
}

// Gốc chỉ gỡ MỘT phần tử inboxId (nhiều conversation cùng inbox vẫn còn phần tử của nó).
export function removeFromSelection(selection: BulkSelection, conversationId: number, inboxId: number): BulkSelection {
    const index = selection.inboxIds.indexOf(inboxId);

    return {
        ids: selection.ids.filter(id => id !== conversationId),
        inboxIds:
            index > -1
                ? [...selection.inboxIds.slice(0, index), ...selection.inboxIds.slice(index + 1)]
                : selection.inboxIds,
    };
}

export function selectionOfAll(conversations: Conversation[]): BulkSelection {
    return {
        ids: conversations.map(conversation => conversation.id),
        inboxIds: conversations.map(conversation => conversation.inbox_id),
    };
}

export function isEveryConversationSelected(conversations: Conversation[], selectedIds: number[]): boolean {
    return conversations.length === selectedIds.length && conversations.every(item => selectedIds.includes(item.id));
}

export function uniqueInboxIds(inboxIds: number[]): number[] {
    return [...new Set(inboxIds)];
}

export function everySelectedHasStatus(
    conversations: Conversation[],
    selectedIds: number[],
    status: ConversationStatus,
): boolean {
    if (!selectedIds.length) return false;

    return selectedIds.every(id => conversations.find(item => item.id === id)?.status === status);
}

export interface BulkActionsValue {
    selection: BulkSelection;
    selectConversation: (conversationId: number, inboxId: number) => void;
    deSelectConversation: (conversationId: number, inboxId: number) => void;
    selectAllConversations: (checked: boolean, conversations: Conversation[]) => void;
    resetBulkActions: () => void;
    isConversationSelected: (conversationId: number) => boolean;
    isUpdating: boolean;
    onAssignAgent: (agent: BulkActionAgent) => Promise<void>;
    onAssignTeam: (team: BulkActionTeam) => Promise<void>;
    onUpdateConversations: (status: ConversationStatus, snoozedUntil?: number | null) => Promise<void>;
}

export function useBulkActions(accountId: number): BulkActionsValue {
    const [selection, setSelection] = useState<BulkSelection>(EMPTY_SELECTION);
    const [isUpdating, setIsUpdating] = useState(false);

    const selectConversation = useCallback((conversationId: number, inboxId: number) => {
        setSelection(current => addToSelection(current, conversationId, inboxId));
    }, []);

    const deSelectConversation = useCallback((conversationId: number, inboxId: number) => {
        setSelection(current => removeFromSelection(current, conversationId, inboxId));
    }, []);

    const resetBulkActions = useCallback(() => setSelection(EMPTY_SELECTION), []);

    const selectAllConversations = useCallback((checked: boolean, conversations: Conversation[]) => {
        setSelection(checked ? selectionOfAll(conversations) : EMPTY_SELECTION);
    }, []);

    const process = useCallback(
        async (payload: Omit<BulkActionPayload, 'type' | 'ids'>, ids: number[]) => {
            setIsUpdating(true);
            try {
                await processBulkAction(accountId, { type: 'Conversation', ids, ...payload });
            } finally {
                setIsUpdating(false);
            }
        },
        [accountId],
    );

    const onAssignAgent = useCallback(
        async (agent: BulkActionAgent) => {
            try {
                await process({ fields: { assignee_id: agent.id } }, selection.ids);
                resetBulkActions();
                useAlert(t('BULK_ACTION.ASSIGN_SUCCESFUL'));
            } catch {
                useAlert(t('BULK_ACTION.ASSIGN_FAILED'));
            }
        },
        [process, resetBulkActions, selection.ids],
    );

    const onAssignTeam = useCallback(
        async (team: BulkActionTeam) => {
            try {
                await process({ fields: { team_id: team.id } }, selection.ids);
                resetBulkActions();
                useAlert(t('BULK_ACTION.TEAMS.ASSIGN_SUCCESFUL'));
            } catch {
                useAlert(t('BULK_ACTION.TEAMS.ASSIGN_FAILED'));
            }
        },
        [process, resetBulkActions, selection.ids],
    );

    const onUpdateConversations = useCallback(
        async (status: ConversationStatus, snoozedUntil: number | null = null) => {
            if (!selection.ids.length) return;

            try {
                await process({ fields: { status }, snoozed_until: snoozedUntil }, selection.ids);
                resetBulkActions();
                useAlert(t('BULK_ACTION.UPDATE.UPDATE_SUCCESFUL'));
            } catch {
                useAlert(t('BULK_ACTION.UPDATE.UPDATE_FAILED'));
            }
        },
        [process, resetBulkActions, selection.ids],
    );

    const isConversationSelected = useCallback(
        (conversationId: number) => selection.ids.includes(conversationId),
        [selection.ids],
    );

    return useMemo(
        () => ({
            selection,
            selectConversation,
            deSelectConversation,
            selectAllConversations,
            resetBulkActions,
            isConversationSelected,
            isUpdating,
            onAssignAgent,
            onAssignTeam,
            onUpdateConversations,
        }),
        [
            selection,
            selectConversation,
            deSelectConversation,
            selectAllConversations,
            resetBulkActions,
            isConversationSelected,
            isUpdating,
            onAssignAgent,
            onAssignTeam,
            onUpdateConversations,
        ],
    );
}

// Thay provide/inject `selectConversation` / `deSelectConversation` / `isConversationSelected`
// của ChatList.vue — card đọc qua context này.
export interface BulkSelectionContextValue {
    isConversationSelected: (conversationId: number) => boolean;
    selectConversation: (conversationId: number, inboxId: number) => void;
    deSelectConversation: (conversationId: number, inboxId: number) => void;
}

export const BulkSelectionContext = createContext<BulkSelectionContextValue | null>(null);

export function useBulkSelection(): BulkSelectionContextValue | null {
    return useContext(BulkSelectionContext);
}
