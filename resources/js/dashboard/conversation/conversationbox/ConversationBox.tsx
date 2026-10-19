import { useConversation } from '../ConversationContext';
import ConversationHeader from './ConversationHeader';
import EmptyState from './EmptyState';
import MessagesView from './MessagesView';

export default function ConversationBox({ className = '' }: { className?: string }) {
    const { selectedConversation, isOnExpandedLayout } = useConversation();

    return (
        <div className={`conversation-details-wrap flex flex-col min-w-0 w-full bg-n-surface-canvas relative ${className}`}>
            {selectedConversation ? <ConversationHeader showBackButton={isOnExpandedLayout} /> : null}
            <div className="flex h-full min-h-0 m-0">
                {selectedConversation ? <MessagesView /> : <EmptyState />}
            </div>
        </div>
    );
}
