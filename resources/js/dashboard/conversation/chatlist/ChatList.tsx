import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import type { ChatListTab } from '../types';
import ChatListHeader from './ChatListHeader';
import ChatTypeTabs from './ChatTypeTabs';
import ConversationList from './ConversationList';

const TAB_KEYS: ChatListTab[] = ['all', 'requests'];

export default function ChatList({ showConversationList = true }: { showConversationList?: boolean }) {
    const { conversations, listMeta, listLoading, endReached, tab, setTab, searchQuery, isOnExpandedLayout, loadMoreConversations } =
        useConversation();

    const tabItems = TAB_KEYS.map(key => ({
        key,
        name: t(`CHAT.TABS.${key.toUpperCase()}`),
        count: key === 'requests' ? listMeta.request_count : 0,
    }));

    const emptyMessage = searchQuery
        ? t('CHAT_LIST.SEARCH.NO_RESULTS', { query: searchQuery })
        : t(tab === 'requests' ? 'CHAT.EMPTY.REQUESTS' : 'CHAT.EMPTY.ALL');

    return (
        <div
            // min-w-0: flex item mặc định min-width:auto nên cột này phình theo nội dung
            // rộng nhất bên trong và tràn khỏi màn hình điện thoại, không cuộn ngang được.
            className={`flex flex-col flex-shrink-0 min-w-0 conversations-list-wrap bg-n-surface-list relative ${
                showConversationList ? '' : 'hidden'
            } ${isOnExpandedLayout ? 'basis-full' : 'w-[340px] 2xl:w-[412px]'}`}
        >
            <ChatListHeader pageTitle={t('PEOPLE.CHAT.TITLE')} isOnExpandedLayout={isOnExpandedLayout} />
            <ChatTypeTabs items={tabItems} activeTab={tab} onChatTabChange={setTab} />
            {!listLoading && !conversations.length ? (
                <p className="px-4 py-6 mb-0 text-sm text-center break-words text-n-slate-11">{emptyMessage}</p>
            ) : null}
            <ConversationList
                conversationList={conversations}
                isLoading={listLoading}
                showEndOfListMessage={conversations.length > 0 && endReached && !listLoading}
                onLoadMore={loadMoreConversations}
            />
        </div>
    );
}
