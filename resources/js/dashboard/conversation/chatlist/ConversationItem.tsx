import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { router, usePage } from '@inertiajs/react';

import ConversationCard from '../../components/widgets/conversation/ConversationCard';
import ConversationContextMenu from '../../components/widgets/conversation/conversationCardComponents/ConversationContextMenu';
import { useBulkSelection } from 'dashboard/composables/useBulkActions';
import { conversationListPageURL, conversationUrl } from 'dashboard/helper/URLHelper';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import type { Conversation } from '../types';

// Port từ dashboard/components/ConversationItem.vue — cắt: expanded layout.
// Bulk select đọc qua BulkSelectionContext (thay inject
// 'isConversationSelected'/'selectConversation' của ChatList.vue). Context menu
// chuột phải mới có phần đọc/chưa đọc (B8); các mục còn lại nợ B10.
interface ConversationItemProps {
    source: Conversation;
    showAssignee?: boolean;
    // Tab hội thoại lọc sẵn đang mở (mention…) — quyết định URL của thẻ như gốc.
    conversationType?: string;
}

export default function ConversationItem({
    source,
    showAssignee = false,
    conversationType = '',
}: ConversationItemProps) {
    const { accountId, inboxId, teamId, label, conversationId, markMessagesRead, markMessagesUnread } =
        useConversation();
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

    const conversationPath = conversationUrl({ accountId, inboxId, teamId, label, conversationType, id: source.id });

    // watch(() => props.source.id) gốc: hàng bị tái dùng cho hội thoại khác thì đóng menu.
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    useEffect(() => setContextMenu(null), [source.id]);

    const openContextMenu = (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        setContextMenu({ x: event.pageX || event.clientX, y: event.pageY || event.clientY });
    };
    const closeContextMenu = () => setContextMenu(null);

    const onMarkAsRead = () => {
        void markMessagesRead(source.id);
        closeContextMenu();
    };

    // markAsUnread gốc quay về danh sách — ở lại hội thoại thì nó bị đánh dấu đã đọc ngay.
    const onMarkAsUnread = () => {
        markMessagesUnread(source.id).then(
            () => router.visit(conversationListPageURL({ accountId, inboxId, teamId, label, conversationType })),
            () => undefined,
        );
        closeContextMenu();
    };

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
        <>
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
                onContextMenu={openContextMenu}
                onSelectConversation={bulkSelection?.selectConversation}
                onDeSelectConversation={bulkSelection?.deSelectConversation}
            />
            {contextMenu ? (
                <ConversationContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    hasUnreadMessages={source.unread_count > 0}
                    onMarkAsRead={onMarkAsRead}
                    onMarkAsUnread={onMarkAsUnread}
                    onClose={closeContextMenu}
                />
            ) : null}
        </>
    );
}
