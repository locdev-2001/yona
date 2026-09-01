import Dashboard from '../Dashboard';
import { ConversationProvider } from './ConversationContext';
import ChatList from './chatlist/ChatList';
import ConversationBox from './conversationbox/ConversationBox';

// Port từ routes/dashboard/conversation/ConversationView.vue — trang 3 cột
// (Sidebar shell + ChatList + ConversationBox). Bỏ ở B3: expanded layout
// (conversation_display_type), ConversationSidebar/SidepanelSwitch (B11),
// CmdBarConversationSnooze (B5/B10).
interface Props {
    conversationId?: number;
    inboxId?: number;
}

export default function ConversationView({ conversationId = 0, inboxId = 0 }: Props) {
    return (
        <Dashboard>
            <ConversationProvider conversationId={conversationId} inboxId={inboxId}>
                <section className="flex w-full h-full min-w-0">
                    <ChatList />
                    <ConversationBox />
                </section>
            </ConversationProvider>
        </Dashboard>
    );
}
