import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { ASSIGNEE_TYPE } from '../constants';
import { useConversation } from '../ConversationContext';
import type { AssigneeTab } from '../types';
import ChatListHeader from './ChatListHeader';
import ChatTypeTabs from './ChatTypeTabs';
import ConversationList from './ConversationList';

// Port từ dashboard/components/ChatList.vue — cắt B3: custom views/folders,
// advanced filters, bulk actions, delete dialog, mentions/participating/
// unattended view, expanded layout. State list nằm ở ConversationContext.
const ASSIGNEE_TAB_KEYS: { key: AssigneeTab; countKey: 'mine_count' | 'unassigned_count' | 'all_count' }[] = [
    { key: ASSIGNEE_TYPE.ME, countKey: 'mine_count' },
    { key: ASSIGNEE_TYPE.UNASSIGNED, countKey: 'unassigned_count' },
    { key: ASSIGNEE_TYPE.ALL, countKey: 'all_count' },
];

export default function ChatList() {
    const {
        conversations,
        listMeta,
        listLoading,
        endReached,
        assigneeTab,
        status,
        inboxId,
        teamId,
        setAssigneeTab,
        loadMoreConversations,
    } = useConversation();
    const { inboxes = [], teams = [] } = usePage<DashboardPageProps>().props;

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
        <div className="flex flex-col flex-shrink-0 conversations-list-wrap bg-n-surface-1 relative w-[340px] 2xl:w-[412px]">
            <ChatListHeader pageTitle={pageTitle} activeStatus={status} />
            <ChatTypeTabs items={assigneeTabItems} activeTab={assigneeTab} onChatTabChange={setAssigneeTab} />
            {!listLoading && !conversations.length ? (
                <p className="flex overflow-auto justify-center items-center p-4">{t('CHAT_LIST.LIST.404')}</p>
            ) : null}
            <ConversationList
                conversationList={conversations}
                isLoading={listLoading}
                showEndOfListMessage={showEndOfListMessage}
                showAssignee={showAssigneeInConversationCard}
                onLoadMore={loadMoreConversations}
            />
        </div>
    );
}
