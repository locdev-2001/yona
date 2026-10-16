import { memo, useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import { router } from '@inertiajs/react';

import ConversationCard from '../../components/widgets/conversation/ConversationCard';
import ConversationContextMenu from '../../components/widgets/conversation/conversationCardComponents/ConversationContextMenu';
import type { PinMoveDirection } from '../../components/widgets/conversation/conversationCardComponents/ConversationContextMenu';
import type { DashboardPageProps } from '../../types';
import type { Conversation, ConversationMessage } from '../types';
import { matchedMessagePreview, withFocusMessage } from './listSearch';

type DashboardInbox = NonNullable<DashboardPageProps['inboxes']>[number];

// Thao tác dùng chung cho mọi thẻ, ConversationList giữ ổn định tham chiếu.
export interface ConversationItemActions {
    markMessagesRead: (conversationId: number) => unknown;
    markUnreadAndLeave: (conversationId: number) => unknown;
    setConversationPinned: (conversationId: number, pinned: boolean) => unknown;
    focusMessage: (messageId: number) => unknown;
    movePin: (conversationId: number, direction: PinMoveDirection) => void;
    selectConversation?: (conversationId: number, inboxId: number) => void;
    deSelectConversation?: (conversationId: number, inboxId: number) => void;
}

// Port từ dashboard/components/ConversationItem.vue — cắt: expanded layout.
// Thẻ không đọc context: mọi dữ liệu đến qua props giá trị nguyên thuỷ hoặc tham
// chiếu ổn định, để `memo` chỉ vẽ lại thẻ có hội thoại thật sự đổi khi danh sách
// nhận cập nhật realtime. Menu thao tác mở bằng chuột phải hoặc nút "…" trên thẻ.
interface ConversationItemProps {
    source: Conversation;
    inbox?: DashboardInbox;
    // URL mở hội thoại theo bộ lọc đang xem của danh sách.
    conversationPath: string;
    actions: ConversationItemActions;
    isActiveChat?: boolean;
    isSelecting?: boolean;
    isSelected?: boolean;
    showAssignee?: boolean;
    searchQuery?: string;
    // Mục "Hội thoại" của ô tìm: dòng xem trước là tin khớp, bấm thẻ nhảy tới tin đó.
    matchedMessage?: ConversationMessage | null;
    // Thẻ đã ghim trong danh sách xếp được: các mục đổi chỗ trong nhóm ghim.
    isSortablePin?: boolean;
    canMovePinUp?: boolean;
    canMovePinDown?: boolean;
}

function ConversationItem({
    source,
    inbox: knownInbox,
    conversationPath: listConversationPath,
    actions,
    isActiveChat = false,
    isSelecting = false,
    isSelected = false,
    showAssignee = false,
    searchQuery = '',
    matchedMessage = null,
    isSortablePin = false,
    canMovePinUp = false,
    canMovePinDown = false,
}: ConversationItemProps) {
    const chatMetadata = source.meta || {};
    const assignee = chatMetadata.assignee || {};
    const currentContact = chatMetadata.sender || { id: 0, name: null };

    const inbox = useMemo(
        () => knownInbox ?? { id: source.inbox_id, name: '', channel_type: '' },
        [knownInbox, source.inbox_id],
    );
    // Dòng trên của thẻ luôn là nền tảng + hộp thư, kể cả khi account chỉ có một hộp thư.
    const showInboxName = Boolean(inbox.name);

    const conversationPath = matchedMessage ? withFocusMessage(listConversationPath, matchedMessage.id) : listConversationPath;
    const previewMessage = useMemo(
        () => (matchedMessage ? matchedMessagePreview(matchedMessage, searchQuery) : undefined),
        [matchedMessage, searchQuery],
    );

    // watch(() => props.source.id) gốc: hàng bị tái dùng cho hội thoại khác thì đóng menu.
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
    useEffect(() => setContextMenu(null), [source.id]);

    const openContextMenu = (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        setContextMenu({ x: event.pageX || event.clientX, y: event.pageY || event.clientY });
    };
    const closeContextMenu = () => setContextMenu(null);

    const onTogglePin = () => {
        void actions.setConversationPinned(source.id, !source.pinned);
        closeContextMenu();
    };

    const contextMenuPinMoves = isSortablePin
        ? {
              canMoveUp: canMovePinUp,
              canMoveDown: canMovePinDown,
              onMove: (direction: PinMoveDirection) => {
                  actions.movePin(source.id, direction);
                  closeContextMenu();
              },
          }
        : null;

    const onMarkAsRead = () => {
        void actions.markMessagesRead(source.id);
        closeContextMenu();
    };

    const onMarkAsUnread = () => {
        void actions.markUnreadAndLeave(source.id);
        closeContextMenu();
    };

    const onCardClick = (event: MouseEvent<HTMLDivElement>) => {
        if (isSelecting) {
            if (isSelected) actions.deSelectConversation?.(source.id, source.inbox_id);
            else actions.selectConversation?.(source.id, source.inbox_id);
            return;
        }

        if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            window.open(conversationPath, '_blank', 'noopener,noreferrer');
            return;
        }

        if (isActiveChat) {
            if (matchedMessage) void actions.focusMessage(matchedMessage.id);
            return;
        }
        router.visit(conversationPath, { preserveState: true, preserveScroll: true });
    };

    return (
        <>
            <ConversationCard
                chat={source}
                currentContact={currentContact}
                assignee={assignee}
                inbox={inbox}
                selected={isSelected}
                isSelecting={isSelecting}
                isActiveChat={isActiveChat}
                showAssignee={showAssignee}
                showInboxName={showInboxName}
                // Mục "Hội thoại" khớp theo tin, không theo tên: chỉ tô trong đoạn tin khớp.
                highlightQuery={matchedMessage ? '' : searchQuery}
                previewHighlightQuery={searchQuery}
                previewMessage={previewMessage}
                onClick={onCardClick}
                onContextMenu={openContextMenu}
                onOpenActions={setContextMenu}
                onSelectConversation={actions.selectConversation}
                onDeSelectConversation={actions.deSelectConversation}
            />
            {contextMenu ? (
                <ConversationContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    hasUnreadMessages={source.unread_count > 0}
                    isPinned={Boolean(source.pinned)}
                    onMarkAsRead={onMarkAsRead}
                    onMarkAsUnread={onMarkAsUnread}
                    onTogglePin={onTogglePin}
                    pinMoves={contextMenuPinMoves}
                    onClose={closeContextMenu}
                />
            ) : null}
        </>
    );
}

export default memo(ConversationItem);
