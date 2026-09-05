import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import { t } from '../../../../../i18n';

// Port từ dashboard/components/ui/ContextMenu.vue + widgets/conversation/contextMenu/
// (Index.vue + menuItem.vue). Phạm vi B8: chỉ mục Mark as read / Mark as unread.
// NỢ (B10): status/snooze, priority, label, agent, team, open in new tab, copy link,
// delete — cùng `contextMenuElementTarget` (khóa cuộn) mà ChatList không cung cấp.

const PADDING = 16;

export function calculateContextMenuPosition(
    x: number,
    y: number,
    menuWidth: number,
    menuHeight: number,
    windowWidth: number,
    windowHeight: number,
): { left: number; top: number } {
    let left = x;
    let top = y;
    if (left + menuWidth > windowWidth - PADDING) left = windowWidth - menuWidth - PADDING;
    if (top + menuHeight > windowHeight - PADDING) top = windowHeight - menuHeight - PADDING;
    return { left: Math.max(PADDING, left), top: Math.max(PADDING, top) };
}

interface MenuItemProps {
    label: string;
    icon: string;
    onClick: () => void;
}

// menuItem.vue variant="icon" — class scoped `.menu` / `.menu-label` viết thẳng ra utility.
function MenuItem({ label, icon, onClick }: MenuItemProps) {
    return (
        <div
            className="menu group text-n-slate-12 min-h-7 min-w-0 w-[12.5rem] flex items-center flex-nowrap p-1 rounded-md overflow-hidden cursor-pointer hover:bg-n-brand hover:text-white"
            role="button"
            onClick={(event) => {
                event.stopPropagation();
                onClick();
            }}
        >
            <FluentIcon icon={icon} size={14} className="flex-shrink-0" />
            <p className="menu-label my-0 mx-2 text-xs flex-shrink-0 truncate min-w-0 flex-1">{label}</p>
        </div>
    );
}

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
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ left: x, top: y });

    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!menu) return;
        setPosition(
            calculateContextMenuPosition(
                x,
                y,
                menu.offsetWidth,
                menu.offsetHeight,
                window.innerWidth,
                window.innerHeight,
            ),
        );
    }, [x, y]);

    useEffect(() => {
        menuRef.current?.focus();
    }, []);

    // focusout gốc: đóng khi tiêu điểm rời hẳn khỏi menu.
    const handleFocusOut = (event: FocusEvent<HTMLDivElement>) => {
        if (menuRef.current?.contains(event.relatedTarget)) return;
        onClose();
    };

    return createPortal(
        <div
            ref={menuRef}
            className="fixed outline-none z-[9999] cursor-pointer"
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
            tabIndex={0}
            onBlur={handleFocusOut}
        >
            <div className="p-1 rounded-md shadow-xl bg-n-alpha-3/50 backdrop-blur-[100px] outline-1 outline outline-n-weak/50">
                {hasUnreadMessages ? (
                    <MenuItem
                        label={t('CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_READ')}
                        icon="mail"
                        onClick={onMarkAsRead}
                    />
                ) : (
                    <MenuItem
                        label={t('CONVERSATION.CARD_CONTEXT_MENU.MARK_AS_UNREAD')}
                        icon="mail-unread"
                        onClick={onMarkAsUnread}
                    />
                )}
            </div>
        </div>,
        document.body,
    );
}
