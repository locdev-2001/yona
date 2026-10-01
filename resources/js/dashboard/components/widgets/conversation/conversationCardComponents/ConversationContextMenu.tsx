import type { ReactNode } from 'react';

import ContextMenu from 'dashboard/components/ui/ContextMenu';
import MenuItem from 'dashboard/components/widgets/conversation/contextMenu/MenuItem';
import { t } from '../../../../../i18n';
import { ICONS } from 'dashboard/icons';

// Port từ widgets/conversation/contextMenu/Index.vue. Phạm vi B8: chỉ mục
// Mark as read / Mark as unread. NỢ (B10): status/snooze, priority, label, agent,
// team, open in new tab, copy link, delete — cùng `contextMenuElementTarget`
// (khóa cuộn) mà ChatList không cung cấp.
interface ConversationContextMenuProps {
    x: number;
    y: number;
    hasUnreadMessages: boolean;
    onMarkAsRead: () => void;
    onMarkAsUnread: () => void;
    onClose: () => void;
}

export default function ConversationContextMenu({
    x,
    y,
    hasUnreadMessages,
    onMarkAsRead,
    onMarkAsUnread,
    onClose,
}: ConversationContextMenuProps): ReactNode {
    return (
        <ContextMenu x={x} y={y} onClose={onClose}>
            <div className="p-1 rounded-md shadow-xl bg-n-alpha-3/50 backdrop-blur-[100px] outline-1 outline outline-n-weak/50">
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
