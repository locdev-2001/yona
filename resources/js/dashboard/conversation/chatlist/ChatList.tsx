import { isProductFeatureVisible } from 'shared/helpers/productVisibility';
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
import SaveCustomView from 'dashboard/components-next/filter/SaveCustomView';
import type { ConversationFilterCondition } from 'dashboard/components-next/filter/helper/filterHelper';
import { buildConversationFilterPayload, conditionsFromPayload } from 'dashboard/components-next/filter/helper/filterQuery';
import { useConversationFilterContext } from 'dashboard/components-next/filter/provider';
import DeleteModal from 'dashboard/components/widgets/modal/DeleteModal';
import { useAlert } from 'dashboard/composables/useAlert';
import { deleteCustomView, useCustomViews } from 'dashboard/composables/useCustomViews';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { ASSIGNEE_TYPE, CONVERSATION_TYPE, STATUS_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import { appliedLabelsForSelection } from '../labelHelpers';
import { DEFAULT_LIST_STATUS } from '../listFilters';
import type { AssigneeTab } from '../types';
import NextButton from 'dashboard/components-next/button/Button';
import { emptyListHint } from './emptyListHint';
import ActiveFilterChips from './ActiveFilterChips';
import ChannelChipRow, { hasChannelChipRow } from './ChannelChipRow';
import ChatListHeader from './ChatListHeader';
import ChatTypeTabs from './ChatTypeTabs';
import ConversationList from './ConversationList';
import ListSearchHeader from './ListSearchHeader';
import { useConversationCount } from './useConversationCount';
import { useListSearchResults } from './useListSearchResults';

// Port từ dashboard/components/ChatList.vue — cắt: participating/unattended view. Tab Mentions dùng chung màn này
// và chung một nguồn danh sách: `conversationType` chỉ đổi tham số lọc gửi lên
// server (ConversationContext) và tiêu đề trang.
// Advanced filter: modal mở/đóng + validate như gốc (teleport vào
// #conversationFilterTeleportTarget), Apply gọi endpoint filter riêng.
const ASSIGNEE_TAB_KEYS: {
    key: AssigneeTab;
    countKey: 'mine_count' | 'unassigned_count' | 'all_count';
    badgeTone?: 'warning';
}[] = [
    { key: ASSIGNEE_TYPE.ALL, countKey: 'all_count' },
    { key: ASSIGNEE_TYPE.ME, countKey: 'mine_count' },
    { key: ASSIGNEE_TYPE.UNASSIGNED, countKey: 'unassigned_count', badgeTone: 'warning' },
];

// Khi ẩn trạng thái hội thoại, hội thoại chờ người nhận chấp nhận có tab riêng cạnh "Tất cả".
const PENDING_TAB = STATUS_TYPE.PENDING;
const hasPendingTab = !isProductFeatureVisible('conversationStatus');

type ChatListTab = AssigneeTab | typeof PENDING_TAB;

export default function ChatList({
    showConversationList = true,
    foldersId = 0,
}: {
    showConversationList?: boolean;
    foldersId?: number;
}) {
    const {
        accountId,
        conversations,
        listMeta,
        listLoading,
        endReached,
        assigneeTab,
        status,
        sortBy,
        appliedFilters,
        listFilters,
        teamId,
        conversationType,
        searchQuery,
        isOnExpandedLayout,
        setAssigneeTab,
        setStatusFilter,
        applyConversationFilters,
        clearConversationFilters,
        loadMoreConversations,
    } = useConversation();
    const { inboxes = [], teams = [] } = usePage<DashboardPageProps>().props;
    // Có từ khoá thì cột hiện kết quả chia mục thay cho danh sách thường; bỏ từ khoá
    // là danh sách thường (ghim, phân trang) trở lại nguyên vẹn.
    const listSearch = useListSearchResults();
    const isSearching = Boolean(searchQuery);
    const tabMeta = isSearching && listSearch.meta ? listSearch.meta : listMeta;

    const bulkActions = useBulkActions(accountId);
    const { selection, resetBulkActions, selectAllConversations } = bulkActions;
    useBulkActionsHotKeys(selection.ids.length);

    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [draftFilters, setDraftFilters] = useState<ConversationFilterCondition[]>([{ ...DEFAULT_FILTER }]);
    const [teleportTarget, setTeleportTarget] = useState<HTMLElement | null>(null);
    const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
    const [saveTeleportTarget, setSaveTeleportTarget] = useState<HTMLElement | null>(null);
    const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
    const attributeFilterTypes = useConversationFilterContext();

    const folders = useCustomViews(accountId, 'conversation');
    const activeFolder = foldersId ? folders.find(view => view.id === foldersId) : undefined;
    const activeFolderQuery = activeFolder ? JSON.stringify(activeFolder.query?.payload ?? []) : '';

    useEffect(() => {
        setTeleportTarget(document.getElementById('conversationFilterTeleportTarget'));
    }, [showAdvancedFilters]);

    useEffect(() => {
        setSaveTeleportTarget(document.getElementById('saveFilterTeleportTarget'));
    }, [showSaveFilterModal]);

    // fetchSavedFilteredConversations của gốc: mở folder = áp query đã lưu.
    // Một nguồn duy nhất cho "danh sách đang lọc" — không có đường nạp riêng cho folder.
    useEffect(() => {
        if (!activeFolderQuery) return;
        applyConversationFilters(conditionsFromPayload(JSON.parse(activeFolderQuery), attributeFilterTypes));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFolderQuery]);

    // resetBulkActions của gốc: đổi tab, đổi bộ lọc cơ bản (status/sort), đổi inbox/team.
    useEffect(() => {
        resetBulkActions();
    }, [assigneeTab, status, sortBy, listFilters.inboxIds, teamId, listFilters.labels, resetBulkActions]);

    const closeAdvanceFiltersModal = useCallback(() => setShowAdvancedFilters(false), []);

    const onApplyFilter = useCallback((filters: ConversationFilterCondition[]) => {
        resetBulkActions();
        if (filters.length) applyConversationFilters(filters);
        else clearConversationFilters();
        closeAdvanceFiltersModal();
    }, [resetBulkActions, applyConversationFilters, clearConversationFilters, closeAdvanceFiltersModal]);

    const allConversationsSelected = isEveryConversationSelected(conversations, selection.ids);
    const appliedLabels = useMemo(
        () => appliedLabelsForSelection(conversations, selection.ids),
        [conversations, selection.ids],
    );
    const selectedInboxes = useMemo(() => uniqueInboxIds(selection.inboxIds), [selection.inboxIds]);
    const toggleSelectAll = useCallback(
        (checked: boolean) => selectAllConversations(checked, conversations),
        [selectAllConversations, conversations],
    );

    const [selectionModeRequested, setSelectionModeRequested] = useState(false);
    const isSelecting = selectionModeRequested || selection.ids.length > 0;
    const toggleSelectionMode = () => {
        if (isSelecting) resetBulkActions();
        setSelectionModeRequested(!isSelecting);
    };

    const bulkSelectionValue = useMemo(
        () => ({
            isSelecting,
            isConversationSelected: bulkActions.isConversationSelected,
            selectConversation: bulkActions.selectConversation,
            deSelectConversation: bulkActions.deSelectConversation,
        }),
        [isSelecting, bulkActions.isConversationSelected, bulkActions.selectConversation, bulkActions.deSelectConversation],
    );

    // onToggleAdvanceFiltersModal: mở lần đầu khởi tạo 1 dòng mặc định (status = ...).
    const onToggleAdvanceFiltersModal = () => {
        if (showAdvancedFilters) {
            closeAdvanceFiltersModal();
            return;
        }
        setDraftFilters(appliedFilters ? appliedFilters.map(filter => ({ ...filter })) : [{ ...DEFAULT_FILTER }]);
        setShowAdvancedFilters(true);
    };

    // openLastItemAfterDeleteInFolder của gốc: xoá xong về folder cuối, hết folder thì về home.
    const deleteActiveFolder = async () => {
        if (!activeFolder) return;
        try {
            await deleteCustomView(accountId, activeFolder.id, 'conversation');
            setShowDeleteFolderModal(false);
            useAlert(t('FILTER.CUSTOM_VIEWS.DELETE.API_FOLDERS.SUCCESS_MESSAGE'));
            const remaining = folders.filter(view => view.id !== activeFolder.id);
            const last = remaining[remaining.length - 1];
            window.location.assign(
                accountScopedUrl(accountId, last ? `custom_view/${last.id}` : 'dashboard'),
            );
        } catch (error) {
            useAlert(parseApiErrorMessage(error) || t('FILTER.CUSTOM_VIEWS.DELETE.API_FOLDERS.ERROR_MESSAGE'));
        }
    };

    // pageTitle gốc: inbox.name → activeTeam.name → #label → conversationType → mặc định.
    const activeInbox = inboxes.find(item => listFilters.inboxIds.includes(item.id));
    const activeTeam = teamId ? teams.find(item => item.id === teamId) : undefined;
    const pageTitle =
        activeFolder?.name ||
        activeInbox?.name ||
        activeTeam?.name ||
        listFilters.labels.map(label => `#${label}`).join(' ') ||
        (conversationType === CONVERSATION_TYPE.MENTION ? t('CHAT_LIST.MENTION_HEADING') : '') ||
        t('CHAT_LIST.TAB_HEADING');

    const isViewingPending = status === PENDING_TAB;
    const mainCount = useConversationCount(DEFAULT_LIST_STATUS);
    const pendingCount = useConversationCount(PENDING_TAB);

    const isAssignmentVisible = isProductFeatureVisible('conversationAssignment');
    const assigneeTabItems = ASSIGNEE_TAB_KEYS.filter(({ key }) => isAssignmentVisible || key === ASSIGNEE_TYPE.ALL).map(
        ({ key, countKey, badgeTone }) => ({
            key: key as ChatListTab,
            badgeTone,
            name: t(`CHAT_LIST.ASSIGNEE_TYPE_TABS.${key}`),
            count: hasPendingTab && key === ASSIGNEE_TYPE.ALL ? mainCount : tabMeta[countKey] || 0,
        }),
    );
    const chatTabItems = hasPendingTab
        ? [
              ...assigneeTabItems,
              {
                  key: PENDING_TAB as ChatListTab,
                  name: t('CHAT.TABS.REQUESTS'),
                  count: pendingCount,
              },
          ]
        : assigneeTabItems;
    const activeChatTab: ChatListTab = isViewingPending ? PENDING_TAB : assigneeTab;

    const onChatTabChange = (tab: ChatListTab) => {
        if (tab === PENDING_TAB) {
            setStatusFilter(PENDING_TAB);

            return;
        }
        if (isViewingPending) setStatusFilter(DEFAULT_LIST_STATUS);
        if (tab !== assigneeTab) setAssigneeTab(tab);
    };

    const emptyHint = emptyListHint(assigneeTab, listMeta, appliedFilters !== null);

    const showAssigneeInConversationCard = isAssignmentVisible && (appliedFilters !== null || assigneeTab === ASSIGNEE_TYPE.ALL);
    const showEndOfListMessage = conversations.length > 0 && endReached && !listLoading;

    return (
        <BulkSelectionContext.Provider value={bulkSelectionValue}>
            <div
                // min-w-0: flex item mặc định min-width:auto nên cột này phình theo nội dung
                // rộng nhất bên trong và tràn khỏi màn hình điện thoại, không cuộn ngang được.
                className={`flex flex-col flex-shrink-0 min-w-0 conversations-list-wrap bg-n-surface-list relative ${
                    showConversationList ? '' : 'hidden'
                } ${isOnExpandedLayout ? 'basis-full' : 'w-[340px] 2xl:w-[412px]'}`}
            >
                <ChatListHeader
                    pageTitle={pageTitle}
                    isOnExpandedLayout={isOnExpandedLayout}
                    onFiltersModal={onToggleAdvanceFiltersModal}
                    hasAppliedFilters={appliedFilters !== null}
                    activeFolderName={activeFolder?.name}
                    allCount={tabMeta.all_count || 0}
                    isListLoading={isSearching ? listSearch.loading : listLoading}
                    onResetFilters={clearConversationFilters}
                    onAddFolders={() => setShowSaveFilterModal(true)}
                    onDeleteFolders={() => setShowDeleteFolderModal(true)}
                />
                {appliedFilters === null ? (
                    <>
                        {/* Điện thoại chỉ có một tab "Tất cả" thì bỏ cả hàng, dải kênh bên dưới đủ để lọc. */}
                        <div className={`flex items-center min-w-0 ${chatTabItems.length > 1 ? '' : 'max-md:hidden'}`}>
                            <div className="flex-1 min-w-0">
                                <ChatTypeTabs items={chatTabItems} activeTab={activeChatTab} onChatTabChange={onChatTabChange} />
                            </div>
                            {/* Thẳng cột với nút "…" của thẻ hội thoại. */}
                            <div className="flex flex-shrink-0 py-1 pe-4 overflow-hidden [scrollbar-gutter:stable]">
                                <NextButton
                                    xs
                                    ghost
                                    slate={!isSelecting}
                                    icon={isSelecting ? 'i-lucide-x' : 'i-lucide-list-checks'}
                                    title={t(isSelecting ? 'CHAT_LIST.SELECTION_MODE.EXIT' : 'CHAT_LIST.SELECTION_MODE.START')}
                                    aria-label={t(isSelecting ? 'CHAT_LIST.SELECTION_MODE.EXIT' : 'CHAT_LIST.SELECTION_MODE.START')}
                                    aria-pressed={isSelecting}
                                    className="flex-shrink-0 max-md:!size-11"
                                    onClick={toggleSelectionMode}
                                />
                            </div>
                        </div>
                        <ChannelChipRow />
                        <ActiveFilterChips hidesInboxChipsBelowMd={hasChannelChipRow(inboxes.length)} />
                    </>
                ) : null}
                {isSearching && !listSearch.loading && !listSearch.contacts.length && !listSearch.conversations.length ? (
                    <p className="px-4 py-6 mb-0 text-sm text-center break-words text-n-slate-11">
                        {t('CHAT_LIST.SEARCH.NO_RESULTS', { query: searchQuery })}
                    </p>
                ) : null}
                {!isSearching && !listLoading && !conversations.length ? (
                    <div className="flex flex-col gap-2 items-center px-4 py-6 text-center">
                        <p className="mb-0 text-sm text-n-slate-11">{t(isViewingPending ? 'CHAT.EMPTY.REQUESTS' : emptyHint.messageKey)}</p>
                        {emptyHint.action && !isViewingPending ? (
                            <NextButton
                                sm
                                slate
                                icon="i-lucide-arrow-right"
                                label={t(emptyHint.action.labelKey, { count: emptyHint.action.count })}
                                onClick={() => setAssigneeTab(emptyHint.action!.tab)}
                            />
                        ) : null}
                    </div>
                ) : null}
                <ConversationBulkActions
                    accountId={accountId}
                    conversations={selection.ids}
                    allConversationsSelected={allConversationsSelected}
                    selectedInboxes={selectedInboxes}
                    showOpenAction={everySelectedHasStatus(conversations, selection.ids, STATUS_TYPE.OPEN)}
                    showResolvedAction={everySelectedHasStatus(conversations, selection.ids, STATUS_TYPE.RESOLVED)}
                    showSnoozedAction={everySelectedHasStatus(conversations, selection.ids, STATUS_TYPE.SNOOZED)}
                    appliedLabels={appliedLabels}
                    isUpdating={bulkActions.isUpdating}
                    className={isOnExpandedLayout ? 'sm:!w-[24rem] !w-full' : ''}
                    onSelectAllConversations={toggleSelectAll}
                    onAssignAgent={bulkActions.onAssignAgent}
                    onAssignTeam={bulkActions.onAssignTeam}
                    onAssignLabels={bulkActions.onAssignLabels}
                    onRemoveLabels={bulkActions.onRemoveLabels}
                    onUpdateConversations={bulkActions.onUpdateConversations}
                />
                {isSearching ? (
                    <ConversationList
                        key="search"
                        conversationList={listSearch.conversations}
                        header={
                            <ListSearchHeader
                                contacts={listSearch.contacts}
                                hasConversationMatches={listSearch.conversations.length > 0}
                                conversationType={conversationType}
                            />
                        }
                        isLoading={listSearch.loading}
                        showEndOfListMessage={listSearch.conversations.length > 0 && !listSearch.hasMore && !listSearch.loading}
                        showAssignee={showAssigneeInConversationCard}
                        conversationType={conversationType}
                        onLoadMore={listSearch.loadMore}
                    />
                ) : (
                    <ConversationList
                        key="list"
                        conversationList={conversations}
                        sortablePins
                        isLoading={listLoading}
                        showEndOfListMessage={showEndOfListMessage}
                        showAssignee={showAssigneeInConversationCard}
                        conversationType={conversationType}
                        onLoadMore={loadMoreConversations}
                    />
                )}
                {showAdvancedFilters && teleportTarget
                    ? createPortal(
                          <ConversationFilter
                              filters={draftFilters}
                              attributeFilterTypes={attributeFilterTypes}
                              onChange={setDraftFilters}
                              onApplyFilter={onApplyFilter}
                              onClose={closeAdvanceFiltersModal}
                          />,
                          teleportTarget,
                      )
                    : null}
                {showSaveFilterModal && saveTeleportTarget && appliedFilters
                    ? createPortal(
                          <SaveCustomView
                              accountId={accountId}
                              filterType={0}
                              customViewsQuery={buildConversationFilterPayload(appliedFilters)}
                              onClose={() => setShowSaveFilterModal(false)}
                              onSaved={view =>
                                  window.location.assign(accountScopedUrl(accountId, `custom_view/${view.id}`))
                              }
                          />,
                          saveTeleportTarget,
                      )
                    : null}
                {showDeleteFolderModal && activeFolder ? (
                    <DeleteModal
                        show
                        title={t('FILTER.CUSTOM_VIEWS.DELETE.MODAL.CONFIRM.TITLE')}
                        message={t('FILTER.CUSTOM_VIEWS.DELETE.MODAL.CONFIRM.MESSAGE')}
                        messageValue={` ${activeFolder.name}?`}
                        confirmText={t('FILTER.CUSTOM_VIEWS.DELETE.MODAL.CONFIRM.YES')}
                        rejectText={t('FILTER.CUSTOM_VIEWS.DELETE.MODAL.CONFIRM.NO')}
                        onConfirm={deleteActiveFolder}
                        onClose={() => setShowDeleteFolderModal(false)}
                    />
                ) : null}
            </div>
        </BulkSelectionContext.Provider>
    );
}
