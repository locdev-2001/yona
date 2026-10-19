import type { ReactNode } from 'react';

import ContextMenu from 'dashboard/components/ui/ContextMenu';
import MenuItem from 'dashboard/components/widgets/conversation/contextMenu/MenuItem';
import { t } from '../../../../../i18n';
import { ICONS } from 'dashboard/icons';

export type PinMoveDirection = 'top' | 'up' | 'down';

// Đổi chỗ trong nhóm ghim bằng menu: lối duy nhất trên màn cảm ứng (không kéo thả).
export interface PinMoveActions {
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMove: (direction: PinMoveDirection) => void;
}

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
    pinMoves?: PinMoveActions | null;
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
    pinMoves = null,
    onClose,
}: ConversationContextMenuProps): ReactNode {
    return (
        <ContextMenu x={x} y={y} onClose={onClose}>
            <div className="p-1 rounded-md overlay-surface">
                <MenuItem
                    label={t(isPinned ? 'CONVERSATION.CARD_CONTEXT_MENU.UNPIN' : 'CONVERSATION.CARD_CONTEXT_MENU.PIN')}
                    icon={isPinned ? ICONS.unpin : ICONS.pin}
                    onClick={onTogglePin}
                />
                {pinMoves?.canMoveUp ? (
                    <>
                        <MenuItem
                            label={t('CONVERSATION.CARD_CONTEXT_MENU.MOVE_PIN_TOP')}
                            icon={ICONS.pinMoveTop}
                            onClick={() => pinMoves.onMove('top')}
                        />
                        <MenuItem
                            label={t('CONVERSATION.CARD_CONTEXT_MENU.MOVE_PIN_UP')}
                            icon={ICONS.pinMoveUp}
                            onClick={() => pinMoves.onMove('up')}
                        />
                    </>
                ) : null}
                {pinMoves?.canMoveDown ? (
                    <MenuItem
                        label={t('CONVERSATION.CARD_CONTEXT_MENU.MOVE_PIN_DOWN')}
                        icon={ICONS.pinMoveDown}
                        onClick={() => pinMoves.onMove('down')}
                    />
                ) : null}
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
