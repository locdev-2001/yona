import type { MouseEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import ConversationCard from '../../components/widgets/conversation/ConversationCard';
import { useBulkSelection } from 'dashboard/composables/useBulkActions';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import type { Conversation } from '../types';

// Port từ dashboard/components/ConversationItem.vue — cắt: expanded layout,
// context menu chuột phải (B7). Bulk select đọc qua BulkSelectionContext
// (thay inject 'isConversationSelected'/'selectConversation' của ChatList.vue).
interface ConversationItemProps {
    source: Conversation;
    showAssignee?: boolean;
}

export default function ConversationItem({ source, showAssignee = false }: ConversationItemProps) {
    const { accountId, inboxId, teamId, conversationId } = useConversation();
    const bulkSelection = useBulkSelection();
    const { inboxes = [] } = usePage<DashboardPageProps>().props;

    const chatMetadata = source.meta || {};
    const assignee = chatMetadata.assignee || {};
    const currentContact = chatMetadata.sender || { id: 0, name: null };

    const isActiveChat = conversationId === source.id;
    const inbox = inboxes.find(item => item.id === source.inbox_id) ?? {
        id: source.inbox_id,
        name: '',
        channel_type: '',
    };
    const showInboxName = !inboxId && inboxes.length > 1;

    const conversationPath = conversationUrl({ accountId, inboxId, teamId, id: source.id });

    const onCardClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            window.open(conversationPath, '_blank', 'noopener,noreferrer');
            return;
        }

        if (isActiveChat) return;
        router.visit(conversationPath, { preserveState: true, preserveScroll: true });
    };

    return (
        <ConversationCard
            chat={source}
            currentContact={currentContact}
            assignee={assignee}
            inbox={inbox}
            selected={bulkSelection?.isConversationSelected(source.id) ?? false}
            isActiveChat={isActiveChat}
            showAssignee={showAssignee}
            showInboxName={showInboxName}
            onClick={onCardClick}
            onSelectConversation={bulkSelection?.selectConversation}
            onDeSelectConversation={bulkSelection?.deSelectConversation}
        />
    );
}
