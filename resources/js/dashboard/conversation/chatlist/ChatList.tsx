import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePage } from '@inertiajs/react';

import ConversationBulkActions from '../../components/widgets/conversation/conversationBulkActions/Index';
import {
    BulkSelectionContext,
    everySelectedHasStatus,
    isEveryConversationSelected,
    uniqueInboxIds,
    useBulkActions,
} from 'dashboard/composables/useBulkActions';
import { useBulkActionsHotKeys } from 'dashboard/composables/useBulkActionsHotKeys';
import ConversationFilter, { DEFAULT_FILTER } from 'dashboard/components-next/filter/ConversationFilter';
import type { ConversationFilterCondition } from 'dashboard/components-next/filter/helper/filterHelper';
import { useConversationFilterContext } from 'dashboard/components-next/filter/provider';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { ASSIGNEE_TYPE, STATUS_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import type { AssigneeTab } from '../types';
import ChatListHeader from './ChatListHeader';
import ChatTypeTabs from './ChatTypeTabs';
import ConversationList from './ConversationList';

// Port từ dashboard/components/ChatList.vue — cắt: custom views/folders,
// delete dialog, mentions/participating/unattended view.
// Advanced filter: modal mở/đóng + validate như gốc (teleport vào
// #conversationFilterTeleportTarget); Apply chưa lọc list (E1) — xem trace.
const ASSIGNEE_TAB_KEYS: { key: AssigneeTab; countKey: 'mine_count' | 'unassigned_count' | 'all_count' }[] = [
    { key: ASSIGNEE_TYPE.ME, countKey: 'mine_count' },
    { key: ASSIGNEE_TYPE.UNASSIGNED, countKey: 'unassigned_count' },
    { key: ASSIGNEE_TYPE.ALL, countKey: 'all_count' },
];

export default function ChatList({ showConversationList = true }: { showConversationList?: boolean }) {
    const {
        accountId,
        conversations,
        listMeta,
        listLoading,
        endReached,
        assigneeTab,
        status,
        sortBy,
        inboxId,
        teamId,
        isOnExpandedLayout,
        setAssigneeTab,
        loadMoreConversations,
    } = useConversation();
    const { inboxes = [], teams = [] } = usePage<DashboardPageProps>().props;

    const bulkActions = useBulkActions(accountId);
    const { selection, resetBulkActions, selectAllConversations } = bulkActions;
    useBulkActionsHotKeys(selection.ids.length);

    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [appliedFilter, setAppliedFilter] = useState<ConversationFilterCondition[]>([{ ...DEFAULT_FILTER }]);
    const [teleportTarget, setTeleportTarget] = useState<HTMLElement | null>(null);
    const attributeFilterTypes = useConversationFilterContext();

    useEffect(() => {
        setTeleportTarget(document.getElementById('conversationFilterTeleportTarget'));
    }, [showAdvancedFilters]);

    // resetBulkActions của gốc: đổi tab, đổi bộ lọc cơ bản (status/sort), đổi inbox/team.
    useEffect(() => {
        resetBulkActions();
    }, [assigneeTab, status, sortBy, inboxId, teamId, resetBulkActions]);

    const closeAdvanceFiltersModal = useCallback(() => setShowAdvancedFilters(false), []);

    const onApplyFilter = useCallback(() => {
        resetBulkActions();
        closeAdvanceFiltersModal();
    }, [resetBulkActions, closeAdvanceFiltersModal]);

    const allConversationsSelected = isEveryConversationSelected(conversations, selection.ids);
    const selectedInboxes = useMemo(() => uniqueInboxIds(selection.inboxIds), [selection.inboxIds]);
    const toggleSelectAll = useCallback(
        (checked: boolean) => selectAllConversations(checked, conversations),
        [selectAllConversations, conversations],
    );

    const bulkSelectionValue = useMemo(
        () => ({
            isConversationSelected: bulkActions.isConversationSelected,
            selectConversation: bulkActions.selectConversation,
            deSelectConversation: bulkActions.deSelectConversation,
        }),
        [bulkActions.isConversationSelected, bulkActions.selectConversation, bulkActions.deSelectConversation],
    );

    // onToggleAdvanceFiltersModal: mở lần đầu khởi tạo 1 dòng mặc định (status = ...).
    const onToggleAdvanceFiltersModal = () => {
        if (showAdvancedFilters) {
            closeAdvanceFiltersModal();
            return;
        }
        setAppliedFilter([{ ...DEFAULT_FILTER }]);
        setShowAdvancedFilters(true);
    };

    // pageTitle gốc: inbox.name → activeTeam.name → mặc định (label/mention/... vào B7/B8).
    const activeInbox = inboxId ? inboxes.find(item => item.id === inboxId) : undefined;
    const activeTeam = teamId ? teams.find(item => item.id === teamId) : undefined;
    const pageTitle = activeInbox?.name || activeTeam?.name || t('CHAT_LIST.TAB_HEADING');

    const assigneeTabItems = ASSIGNEE_TAB_KEYS.map(({ key, countKey }) => ({
        key,
        name: t(`CHAT_LIST.ASSIGNEE_TYPE_TABS.${key}`),
        count: listMeta[countKey] || 0,
    }));

    const showAssigneeInConversationCard = assigneeTab === ASSIGNEE_TYPE.ALL;
    const showEndOfListMessage = conversations.length > 0 && endReached && !listLoading;

    return (
        <BulkSelectionContext.Provider value={bulkSelectionValue}>
            <div
                className={`flex flex-col flex-shrink-0 conversations-list-wrap bg-n-surface-1 relative ${
                    showConversationList ? '' : 'hidden'
                } ${isOnExpandedLayout ? 'basis-full' : 'w-[340px] 2xl:w-[412px]'}`}
            >
                <ChatListHeader
                    pageTitle={pageTitle}
                    activeStatus={status}
                    isOnExpandedLayout={isOnExpandedLayout}
                    onFiltersModal={onToggleAdvanceFiltersModal}
                />
                <ChatTypeTabs items={assigneeTabItems} activeTab={assigneeTab} onChatTabChange={setAssigneeTab} />
                {!listLoading && !conversations.length ? (
                    <p className="flex overflow-auto justify-center items-center p-4">{t('CHAT_LIST.LIST.404')}</p>
                ) : null}
                <ConversationBulkActions
                    accountId={accountId}
                    conversations={selection.ids}
                    allConversationsSelected={allConversationsSelected}
                    selectedInboxes={selectedInboxes}
                    showOpenAction={everySelectedHasStatus(conversations, selection.ids, STATUS_TYPE.OPEN)}
                    showResolvedAction={everySelectedHasStatus(conversations, selection.ids, STATUS_TYPE.RESOLVED)}
                    showSnoozedAction={everySelectedHasStatus(conversations, selection.ids, STATUS_TYPE.SNOOZED)}
                    isUpdating={bulkActions.isUpdating}
                    className={isOnExpandedLayout ? 'sm:!w-[24rem] !w-full' : ''}
                    onSelectAllConversations={toggleSelectAll}
                    onAssignAgent={bulkActions.onAssignAgent}
                    onAssignTeam={bulkActions.onAssignTeam}
                    onUpdateConversations={bulkActions.onUpdateConversations}
                />
                <ConversationList
                    conversationList={conversations}
                    isLoading={listLoading}
                    showEndOfListMessage={showEndOfListMessage}
                    showAssignee={showAssigneeInConversationCard}
                    onLoadMore={loadMoreConversations}
                />
                {showAdvancedFilters && teleportTarget
                    ? createPortal(
                          <ConversationFilter
                              filters={appliedFilter}
                              attributeFilterTypes={attributeFilterTypes}
                              onChange={setAppliedFilter}
                              onApplyFilter={onApplyFilter}
                              onClose={closeAdvanceFiltersModal}
                          />,
                          teleportTarget,
                      )
                    : null}
            </div>
        </BulkSelectionContext.Provider>
    );
}
