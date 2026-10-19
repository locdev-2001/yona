import Dashboard from '../Dashboard';
import { ConversationProvider, useConversation } from './ConversationContext';
import ChatList from './chatlist/ChatList';
import ConversationBox from './conversationbox/ConversationBox';
import { isThreadOpen, showConversationList as computeShowList, showMessageView as computeShowMessageView } from './layoutMode';

// Trang nhắn tin: thanh bên + cột danh sách + khung chat. Màn hẹp (hoặc đã bấm ⇥)
// là bố cục hai-màn: danh sách chiếm hết khi chưa mở hội thoại.
function ConversationLayout({ conversationId }: { conversationId: number }) {
    const { isOnExpandedLayout } = useConversation();
    const hasOpenThread = isThreadOpen(conversationId, false);
    const showConversationList = computeShowList(isOnExpandedLayout, hasOpenThread);
    const showMessageView = computeShowMessageView(isOnExpandedLayout, hasOpenThread);

    return (
        <section className="flex w-full h-full min-w-0">
            <ChatList showConversationList={showConversationList} />
            {showMessageView ? <ConversationBox /> : null}
        </section>
    );
}

export default function ConversationView({ conversationId = 0 }: { conversationId?: number }) {
    return (
        <Dashboard>
            <ConversationProvider conversationId={conversationId}>
                <ConversationLayout conversationId={conversationId} />
            </ConversationProvider>
        </Dashboard>
    );
}
