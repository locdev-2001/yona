import CmdBarConversationSnooze from 'dashboard/commands/CmdBarConversationSnooze';
import { useConversationHotKeys } from 'dashboard/commands/useConversationHotKeys';
import { useMacroHotKeys } from 'dashboard/commands/useMacroHotKeys';
import Dashboard from '../Dashboard';
import { ConversationProvider, useConversation } from './ConversationContext';
import type { ConversationType } from './constants';
import ChatList from './chatlist/ChatList';
import ConversationBox from './conversationbox/ConversationBox';
import ConversationSidebar from './conversationbox/ConversationSidebar';

// Port từ routes/dashboard/conversation/ConversationView.vue — trang 3 cột
// (Sidebar shell + ChatList + ConversationBox). Layout expanded (⇥) như gốc:
// list chiếm hết khi chưa chọn conversation, chọn rồi thì chỉ còn cột giữa.
// Bỏ ở B3: ConversationSidebar/SidepanelSwitch (B11).
interface Props {
    conversationId?: number;
    inboxId?: number;
    teamId?: number;
    label?: string;
    // prop route conversation_mentions / conversation_through_mentions.
    conversationType?: ConversationType;
}

function ConversationLayout({ conversationId }: { conversationId: number }) {
    const { isOnExpandedLayout, selectedConversation, uiSettings } = useConversation();
    const showConversationList = isOnExpandedLayout ? !conversationId : true;
    const showMessageView = conversationId ? true : !isOnExpandedLayout;
    // shouldShowSidebar gốc: có currentChat + ui_settings.is_contact_sidebar_open.
    const shouldShowSidebar = Boolean(selectedConversation && uiSettings.is_contact_sidebar_open);
    useConversationHotKeys();
    useMacroHotKeys();

    return (
        <section className="flex w-full h-full min-w-0">
            <ChatList showConversationList={showConversationList} />
            {showMessageView ? <ConversationBox /> : null}
            {shouldShowSidebar ? <ConversationSidebar /> : null}
            <CmdBarConversationSnooze />
        </section>
    );
}

export default function ConversationView({
    conversationId = 0,
    inboxId = 0,
    teamId = 0,
    label = '',
    conversationType = '',
}: Props) {
    return (
        <Dashboard>
            <ConversationProvider
                conversationId={conversationId}
                inboxId={inboxId}
                teamId={teamId}
                label={label}
                conversationType={conversationType}
            >
                <ConversationLayout conversationId={conversationId} />
            </ConversationProvider>
        </Dashboard>
    );
}
