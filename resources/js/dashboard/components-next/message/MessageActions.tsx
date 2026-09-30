import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode, TouchEvent as ReactTouchEvent } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { FOCUS_MESSAGE_PARAM } from 'dashboard/conversation/messageFocus';
import { copyTextToClipboard } from 'shared/helpers/clipboard';
import { toCopyText } from 'shared/helpers/MessageFormatter';
import { t } from '../../../i18n';
import { useMessageContext } from './provider';
import { ORIENTATION } from './constants';
import MessageActionMenu from './MessageActionMenu';
import type { MessageActionMenuVariant } from './MessageActionMenu';
import {
    groupMessageActions,
    hasAnyMessageAction,
    messagePermalink,
    resolveMessageActions,
} from './helpers/messageActions';
import type { MessageActionDescriptor, MessageActionId } from './helpers/messageActions';
import { QUICK_REACTIONS } from './helpers/reactions';

// Vùng bong bóng kèm mọi cách mở thao tác trên tin: thanh rê chuột (cảm xúc,
// trả lời, ⋯), chuột phải, và nhấn giữ trên máy cảm ứng. Cả ba đọc chung danh
// sách ở helpers/messageActions.ts và cùng một MessageActionMenu.
//
// Máy không rê chuột được (điện thoại, máy tính bảng) không bao giờ thấy thanh
// rê chuột: nhấn giữ vào tin mở bottom sheet.
const HOVERLESS_POINTER_QUERY = '(hover: none)';

export const LONG_PRESS_MS = 450;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;

function useHoverlessPointer(): boolean {
    const [isHoverless, setHoverless] = useState(
        () => window.matchMedia?.(HOVERLESS_POINTER_QUERY).matches ?? false,
    );

    useEffect(() => {
        const query = window.matchMedia?.(HOVERLESS_POINTER_QUERY);
        if (!query) return undefined;

        const onChange = (event: MediaQueryListEvent) => setHoverless(event.matches);
        setHoverless(query.matches);
        query.addEventListener('change', onChange);

        return () => query.removeEventListener('change', onChange);
    }, []);

    return isHoverless;
}

// Người dùng đang bôi đen chữ trong tin thì chuột phải phải ra menu gốc của
// trình duyệt để chép đúng đoạn đã chọn.
function hasTextSelectionInside(element: HTMLElement): boolean {
    const selection = window.getSelection?.();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return false;

    return element.contains(selection.anchorNode);
}

// Hộp xác nhận chỉ dựng khi cần: thanh hành động có ở MỌI tin, gắn sẵn một
// <dialog> cho mỗi bong bóng là phình DOM vô ích.
function ConfirmDialog({
    title,
    description,
    confirmLabel,
    onConfirm,
    onClose,
}: {
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void;
    onClose: () => void;
}) {
    const dialogRef = useRef<DialogHandle>(null);

    useEffect(() => {
        dialogRef.current?.open();
    }, []);

    return (
        <Dialog
            ref={dialogRef}
            type="alert"
            title={title}
            description={description}
            confirmButtonLabel={confirmLabel}
            cancelButtonLabel={t('CONVERSATION.CONTEXT_MENU.DELETE_CONFIRMATION.CANCEL')}
            onConfirm={onConfirm}
            onClose={onClose}
        />
    );
}

interface OpenMenu {
    variant: MessageActionMenuVariant;
    anchor: { x: number; y: number };
    fromMoreButton: boolean;
}

export default function MessageActions({ className = '', children }: { className?: string; children: ReactNode }) {
    const {
        id,
        content,
        messageType,
        status,
        isPrivate,
        contentAttributes,
        inboxCapabilities,
        orientation,
        onToggleReaction,
        onDeleteMessage,
        onReplyTo,
        onForward,
        onCreateCannedResponse,
        onTranslate,
    } = useMessageContext();
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [isConfirmingDelete, setConfirmingDelete] = useState(false);
    const [openMenu, setOpenMenu] = useState<OpenMenu | null>(null);
    const isHoverlessPointer = useHoverlessPointer();
    const areaRef = useRef<HTMLDivElement>(null);
    const barRef = useRef<HTMLDivElement>(null);
    const moreButtonRef = useRef<HTMLButtonElement>(null);
    const longPressRef = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);

    useEffect(() => {
        if (!isPickerOpen) return undefined;
        const onPointerDownOutside = (event: Event) => {
            if (barRef.current?.contains(event.target as Node)) return;
            setIsPickerOpen(false);
        };
        document.addEventListener('mousedown', onPointerDownOutside);

        return () => document.removeEventListener('mousedown', onPointerDownOutside);
    }, [isPickerOpen]);

    useEffect(() => () => window.clearTimeout(longPressRef.current?.timer), []);

    const flags = resolveMessageActions({
        id,
        messageType,
        status,
        isPrivate,
        content,
        contentAttributes,
        inboxCapabilities,
        handlers: {
            reply: Boolean(onReplyTo),
            react: Boolean(onToggleReaction),
            delete: Boolean(onDeleteMessage),
            forward: Boolean(onForward),
            createCannedResponse: Boolean(onCreateCannedResponse),
            translate: Boolean(onTranslate),
        },
    });
    const menuGroups = groupMessageActions(flags);
    const hasActions = hasAnyMessageAction(flags);

    // Endpoint xoá là MỘT; kênh khai `outbound_recall` thì thu hồi cả hai đầu,
    // không khai thì chỉ xoá ở Yona — nhãn phải nói đúng việc sẽ xảy ra.
    const deleteLabel = flags.recall
        ? t('CONVERSATION.MESSAGE_ACTIONS.RECALL')
        : t('CONVERSATION.MESSAGE_ACTIONS.DELETE');
    // Thu hồi xoá tin ở CẢ hai đầu và không hoàn tác được — phải hỏi lại trước khi làm.
    const confirmTitle = flags.recall
        ? t('CONVERSATION.MESSAGE_ACTIONS.RECALL_CONFIRMATION.TITLE')
        : t('CONVERSATION.CONTEXT_MENU.DELETE_CONFIRMATION.TITLE');
    const confirmDescription = flags.recall
        ? t('CONVERSATION.MESSAGE_ACTIONS.RECALL_CONFIRMATION.MESSAGE')
        : t('CONVERSATION.CONTEXT_MENU.DELETE_CONFIRMATION.MESSAGE');

    const labelOf = (action: MessageActionDescriptor) => (action.id === 'delete' ? deleteLabel : t(action.labelKey));

    const closeMenu = useCallback(() => {
        setOpenMenu(current => {
            if (current?.fromMoreButton) moreButtonRef.current?.focus();
            return null;
        });
    }, []);

    const copyWithNotice = (text: string, successKey: string) => {
        copyTextToClipboard(text)
            .then(() => useAlert(t(successKey)))
            .catch(() => useAlert(t('CONVERSATION.MESSAGE_ACTIONS.COPY_FAILED')));
    };

    const runAction = (actionId: MessageActionId) => {
        closeMenu();
        setIsPickerOpen(false);
        const handlers: Record<MessageActionId, () => void> = {
            reply: () => onReplyTo?.(),
            forward: () => onForward?.(),
            copy: () => copyWithNotice(toCopyText(content), 'CONVERSATION.MESSAGE_ACTIONS.COPIED'),
            copyLink: () =>
                copyWithNotice(
                    messagePermalink(window.location.href, id, FOCUS_MESSAGE_PARAM),
                    'CONVERSATION.CONTEXT_MENU.LINK_COPIED',
                ),
            createCannedResponse: () => onCreateCannedResponse?.(),
            translate: () => onTranslate?.(),
            delete: () => setConfirmingDelete(true),
        };
        handlers[actionId]();
    };

    const openMenuAt = (variant: MessageActionMenuVariant, x: number, y: number, fromMoreButton = false) => {
        setIsPickerOpen(false);
        setOpenMenu({ variant, anchor: { x, y }, fromMoreButton });
    };

    const onContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!hasActions || !areaRef.current || hasTextSelectionInside(areaRef.current)) return;
        // Chuột phải trúng ảnh/video thì để menu gốc của trình duyệt (Sao chép/Lưu hình ảnh).
        if ((event.target as Element).closest?.('img, video')) return;
        event.preventDefault();
        openMenuAt(isHoverlessPointer ? 'sheet' : 'popover', event.clientX, event.clientY);
    };

    const cancelLongPress = () => {
        window.clearTimeout(longPressRef.current?.timer);
    };

    const onTouchStart = (event: ReactTouchEvent<HTMLDivElement>) => {
        if (!hasActions || event.touches.length !== 1) return;
        const touch = event.touches[0];
        cancelLongPress();
        longPressRef.current = {
            x: touch.clientX,
            y: touch.clientY,
            fired: false,
            timer: window.setTimeout(() => {
                if (longPressRef.current) longPressRef.current.fired = true;
                navigator.vibrate?.(10);
                openMenuAt('sheet', touch.clientX, touch.clientY);
            }, LONG_PRESS_MS),
        };
    };

    const onTouchMove = (event: ReactTouchEvent<HTMLDivElement>) => {
        const start = longPressRef.current;
        const touch = event.touches[0];
        if (!start || !touch) return;
        const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
        if (moved > LONG_PRESS_MOVE_TOLERANCE_PX) cancelLongPress();
    };

    // Nhả tay sau khi đã mở sheet thì chặn cú chạm đó, để không mở luôn ảnh hay
    // liên kết nằm dưới ngón tay.
    const onTouchEnd = (event: ReactTouchEvent<HTMLDivElement>) => {
        cancelLongPress();
        if (longPressRef.current?.fired) event.preventDefault();
        longPressRef.current = null;
    };

    const isBarVisible = !isHoverlessPointer && (flags.react || flags.reply || menuGroups.length > 0);
    // Vùng bấm 32px (WCAG 2.2 Target Size tối thiểu 24px, chuột cần ít nhất 32px mới thoải mái).
    const barButtonClass =
        'size-8 grid place-content-center rounded-md text-n-slate-11 hover:text-n-slate-12 hover:bg-n-alpha-2 cursor-pointer transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand';
    const isBarPinned = isPickerOpen || (openMenu?.fromMoreButton ?? false);

    const bar = isBarVisible ? (
        <div
            ref={barRef}
            data-testid="message-action-bar"
            className={`relative flex shrink-0 items-center gap-0.5 self-center transition-opacity duration-150 ${
                isBarPinned ? 'opacity-100' : 'opacity-0 focus-within:opacity-100 group-hover/message:opacity-100'
            } ${orientation === ORIENTATION.RIGHT ? 'me-1' : 'ms-1'}`}
        >
            {flags.react ? (
                <button
                    type="button"
                    className={barButtonClass}
                    title={t('CONVERSATION.MESSAGE_ACTIONS.REACT')}
                    aria-label={t('CONVERSATION.MESSAGE_ACTIONS.REACT')}
                    aria-expanded={isPickerOpen}
                    onClick={() => setIsPickerOpen(open => !open)}
                >
                    <Icon icon="i-lucide-smile-plus" className="size-4" />
                </button>
            ) : null}
            {flags.reply ? (
                <button
                    type="button"
                    className={barButtonClass}
                    title={t('CONVERSATION.MESSAGE_ACTIONS.REPLY')}
                    aria-label={t('CONVERSATION.MESSAGE_ACTIONS.REPLY')}
                    onClick={() => runAction('reply')}
                >
                    <Icon icon="i-lucide-reply" className="size-4" />
                </button>
            ) : null}
            {menuGroups.length > 0 ? (
                <button
                    ref={moreButtonRef}
                    type="button"
                    className={barButtonClass}
                    title={t('CONVERSATION.MESSAGE_ACTIONS.MORE')}
                    aria-label={t('CONVERSATION.MESSAGE_ACTIONS.MORE')}
                    aria-haspopup="menu"
                    aria-expanded={openMenu !== null}
                    onClick={event => {
                        if (openMenu) {
                            closeMenu();
                            return;
                        }
                        const rect = event.currentTarget.getBoundingClientRect();
                        openMenuAt('popover', rect.left, rect.bottom + 4, true);
                    }}
                >
                    <Icon icon="i-lucide-ellipsis" className="size-4" />
                </button>
            ) : null}
            {isPickerOpen ? (
                <div
                    role="group"
                    aria-label={t('CONVERSATION.MESSAGE_ACTIONS.REACT')}
                    className={`absolute bottom-9 z-20 flex items-center gap-0.5 p-1 rounded-full border border-n-weak bg-n-solid-2 shadow-md ${
                        orientation === ORIENTATION.RIGHT ? 'ltr:right-0 rtl:left-0' : 'ltr:left-0 rtl:right-0'
                    }`}
                >
                    {QUICK_REACTIONS.map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            aria-label={emoji}
                            className="size-8 grid place-content-center rounded-full hover:bg-n-alpha-2 cursor-pointer transition-transform duration-150 hover:scale-110"
                            onClick={() => {
                                onToggleReaction?.(emoji);
                                setIsPickerOpen(false);
                            }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    ) : null;

    return (
        <div
            ref={areaRef}
            className={`${className} ${isHoverlessPointer && hasActions ? 'select-none [-webkit-touch-callout:none]' : ''}`.trim()}
            onContextMenu={onContextMenu}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={cancelLongPress}
        >
            {orientation === ORIENTATION.RIGHT ? bar : null}
            {children}
            {orientation === ORIENTATION.LEFT ? bar : null}
            {openMenu ? (
                <MessageActionMenu
                    variant={openMenu.variant}
                    anchor={openMenu.anchor}
                    groups={menuGroups}
                    labelOf={labelOf}
                    reactions={openMenu.variant === 'sheet' && flags.react ? QUICK_REACTIONS : []}
                    onReact={emoji => {
                        closeMenu();
                        onToggleReaction?.(emoji);
                    }}
                    onSelect={runAction}
                    onClose={closeMenu}
                />
            ) : null}
            {isConfirmingDelete ? (
                <ConfirmDialog
                    title={confirmTitle}
                    description={confirmDescription}
                    confirmLabel={deleteLabel}
                    onConfirm={() => {
                        setConfirmingDelete(false);
                        onDeleteMessage?.();
                    }}
                    onClose={() => setConfirmingDelete(false)}
                />
            ) : null}
        </div>
    );
}
