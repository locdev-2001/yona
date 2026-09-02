import Dashboard from '../Dashboard';
import { ConversationProvider, useConversation } from './ConversationContext';
import ChatList from './chatlist/ChatList';
import ConversationBox from './conversationbox/ConversationBox';

// Port từ routes/dashboard/conversation/ConversationView.vue — trang 3 cột
// (Sidebar shell + ChatList + ConversationBox). Layout expanded (⇥) như gốc:
// list chiếm hết khi chưa chọn conversation, chọn rồi thì chỉ còn cột giữa.
// Bỏ ở B3: ConversationSidebar/SidepanelSwitch (B11), CmdBarConversationSnooze (B5/B10).
interface Props {
    conversationId?: number;
    inboxId?: number;
    teamId?: number;
}

function ConversationLayout({ conversationId }: { conversationId: number }) {
    const { isOnExpandedLayout } = useConversation();
    const showConversationList = isOnExpandedLayout ? !conversationId : true;
    const showMessageView = conversationId ? true : !isOnExpandedLayout;

    return (
        <section className="flex w-full h-full min-w-0">
            <ChatList showConversationList={showConversationList} />
            {showMessageView ? <ConversationBox /> : null}
        </section>
    );
}

export default function ConversationView({ conversationId = 0, inboxId = 0, teamId = 0 }: Props) {
    return (
        <Dashboard>
            <ConversationProvider conversationId={conversationId} inboxId={inboxId} teamId={teamId}>
                <ConversationLayout conversationId={conversationId} />
            </ConversationProvider>
        </Dashboard>
    );
}
