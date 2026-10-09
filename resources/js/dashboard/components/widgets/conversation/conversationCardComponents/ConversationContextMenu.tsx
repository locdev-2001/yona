import type { ReactNode } from 'react';

import ContextMenu from 'dashboard/components/ui/ContextMenu';
import MenuItem from 'dashboard/components/widgets/conversation/contextMenu/MenuItem';
import { t } from '../../../../../i18n';
import { ICONS } from 'dashboard/icons';

// Menu thao tác của một thẻ hội thoại. Một nguồn menu cho mọi cách mở: chuột phải
// lên thẻ hoặc nút "…" trên thẻ.
interface ConversationContextMenuProps {
    x: number;
    y: number;
    hasUnreadMessages: boolean;
    isPinned: boolean;
    onMarkAsRead: () => void;
    onMarkAsUnread: () => void;
    onTogglePin: () => void;
    onClose: () => void;
}

export default function ConversationContextMenu({
    x,
    y,
    hasUnreadMessages,
    isPinned,
    onMarkAsRead,
    onMarkAsUnread,
    onTogglePin,
    onClose,
}: ConversationContextMenuProps): ReactNode {
    return (
        <ContextMenu x={x} y={y} onClose={onClose}>
            <div className="p-1 rounded-md shadow-xl bg-n-alpha-3/50 backdrop-blur-[100px] outline-1 outline outline-n-weak/50">
                <MenuItem
                    label={t(isPinned ? 'CONVERSATION.CARD_CONTEXT_MENU.UNPIN' : 'CONVERSATION.CARD_CONTEXT_MENU.PIN')}
                    icon={isPinned ? ICONS.unpin : ICONS.pin}
                    onClick={onTogglePin}
                />
                {hasUnreadMessages ? (
                    <MenuItem
                        label={t('CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_READ')}
                        icon={ICONS.markRead}
                        onClick={onMarkAsRead}
                    />
                ) : (
                    <MenuItem
                        label={t('CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_UNREAD')}
                        icon={ICONS.markUnread}
                        onClick={onMarkAsUnread}
                    />
                )}
            </div>
        </ContextMenu>
    );
}
