import { useConversation } from '../ConversationContext';
import ConversationHeader from './ConversationHeader';
import EmptyState from './EmptyState';
import MessagesView from './MessagesView';
import SidepanelSwitch from './SidepanelSwitch';

// Port từ widgets/conversation/ConversationBox.vue — không có dashboardApps
// (D-group) nên không render woot-tabs/DashboardAppFrame; header luôn kèm
// border-b (điều kiện !dashboardApps.length của bản gốc). Expanded layout:
// bỏ border-l + header hiện BackButton (trừ khi đứng trong trung tâm thông báo).

export default function ConversationBox({
    isInboxView = false,
    className = '',
}: {
    isInboxView?: boolean;
    className?: string;
}) {
    const { selectedConversation, isOnExpandedLayout } = useConversation();
    const currentChat = selectedConversation;

    return (
        <div
            className={`conversation-details-wrap flex flex-col min-w-0 w-full bg-n-surface-1 relative ${
                isOnExpandedLayout ? '' : 'border-l rtl:border-l-0 rtl:border-r border-n-weak'
            } ${className}`}
        >
            {currentChat && (
                <ConversationHeader className="border-b border-b-n-weak !pt-2" showBackButton={isOnExpandedLayout && !isInboxView} />
            )}
            <div className="flex h-full min-h-0 m-0">
                {currentChat ? <MessagesView /> : isInboxView ? null : <EmptyState />}
                {/* slot của ConversationBox.vue: ConversationView đặt SidepanelSwitch khi có currentChat */}
                {currentChat ? <SidepanelSwitch /> : null}
            </div>
        </div>
    );
}
