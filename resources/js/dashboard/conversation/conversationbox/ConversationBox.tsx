import { useConversation } from '../ConversationContext';
import ConversationHeader from './ConversationHeader';
import EmptyState from './EmptyState';
import MessagesView from './MessagesView';

// Port từ widgets/conversation/ConversationBox.vue — không có dashboardApps
// (D-group) nên không render woot-tabs/DashboardAppFrame; header luôn kèm
// border-b (điều kiện !dashboardApps.length của bản gốc). Expanded layout:
// bỏ border-l + header hiện BackButton (isInboxView = false ở B3).

export default function ConversationBox() {
    const { selectedConversation, isOnExpandedLayout } = useConversation();
    const currentChat = selectedConversation;

    return (
        <div
            className={`conversation-details-wrap flex flex-col min-w-0 w-full bg-n-surface-1 relative ${
                isOnExpandedLayout ? '' : 'border-l rtl:border-l-0 rtl:border-r border-n-weak'
            }`}
        >
            {currentChat && (
                <ConversationHeader className="border-b border-b-n-weak !pt-2" showBackButton={isOnExpandedLayout} />
            )}
            <div className="flex h-full min-h-0 m-0">
                {currentChat ? <MessagesView /> : <EmptyState />}
            </div>
        </div>
    );
}
