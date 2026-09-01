import type { MouseEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import ConversationCard from '../../components/widgets/conversation/ConversationCard';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import type { Conversation } from '../types';

// Port từ dashboard/components/ConversationItem.vue — cắt B3: expanded layout,
// context menu chuột phải (B5/B6/B7), bulk select.
interface ConversationItemProps {
    source: Conversation;
    showAssignee?: boolean;
}

export default function ConversationItem({ source, showAssignee = false }: ConversationItemProps) {
    const { accountId, inboxId, conversationId } = useConversation();
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

    const conversationPath = inboxId
        ? `/app/accounts/${accountId}/inbox/${inboxId}/conversations/${source.id}`
        : `/app/accounts/${accountId}/conversations/${source.id}`;

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
            isActiveChat={isActiveChat}
            showAssignee={showAssignee}
            showInboxName={showInboxName}
            onClick={onCardClick}
        />
    );
}
