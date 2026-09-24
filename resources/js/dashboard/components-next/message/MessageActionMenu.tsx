import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import Icon from 'dashboard/components-next/icon/Icon';
import { t } from '../../../i18n';
import type { MessageActionDescriptor, MessageActionId } from './helpers/messageActions';

// Một menu cho mọi cách mở thao tác trên tin: nút ⋯ và chuột phải mở dạng
// `popover` tại điểm neo; nhấn giữ trên điện thoại mở dạng `sheet` từ đáy màn
// hình, có thêm hàng cảm xúc. Render qua portal vì khung danh sách tin cuộn
// (overflow) sẽ cắt mất menu nếu đặt tuyệt đối trong bong bóng.

export type MessageActionMenuVariant = 'popover' | 'sheet';

export interface MessageActionMenuProps {
    variant: MessageActionMenuVariant;
    // Điểm neo (toạ độ màn hình) cho popover; sheet bỏ qua.
    anchor: { x: number; y: number };
    groups: MessageActionDescriptor[][];
    labelOf: (action: MessageActionDescriptor) => string;
    reactions?: readonly string[];
    onReact?: (emoji: string) => void;
    onSelect: (id: MessageActionId) => void;
    onClose: () => void;
}

const VIEWPORT_MARGIN = 8;

function menuItemsOf(menu: HTMLElement | null): HTMLElement[] {
    return Array.from(menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
}

function focusSibling(menu: HTMLElement | null, step: number | 'first' | 'last'): void {
    const items = menuItemsOf(menu);
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
        step === 'first'
            ? 0
            : step === 'last'
              ? items.length - 1
              : (current + step + items.length) % items.length;
    items[next]?.focus();
}

export default function MessageActionMenu({
    variant,
    anchor,
    groups,
    labelOf,
    reactions = [],
    onReact,
    onSelect,
    onClose,
}: MessageActionMenuProps) {
    const panelRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState(anchor);
    const isSheet = variant === 'sheet';

    // Popover không được tràn khỏi màn hình: thiếu chỗ bên phải thì dời sang
    // trái, thiếu chỗ bên dưới thì lật lên trên điểm neo.
    useLayoutEffect(() => {
        if (isSheet || !panelRef.current) return;
        const { width, height } = panelRef.current.getBoundingClientRect();
        const maxX = window.innerWidth - width - VIEWPORT_MARGIN;
        const x = Math.max(VIEWPORT_MARGIN, Math.min(anchor.x, maxX));
        const fitsBelow = anchor.y + height + VIEWPORT_MARGIN <= window.innerHeight;
        const y = fitsBelow ? anchor.y : Math.max(VIEWPORT_MARGIN, anchor.y - height);
        setPosition({ x, y });
    }, [anchor, isSheet]);

    useEffect(() => {
        if (!isSheet) focusSibling(menuRef.current, 'first');
    }, [isSheet]);

    useEffect(() => {
        const closeOnOutsidePointer = (event: Event) => {
            if (panelRef.current?.contains(event.target as Node)) return;
            onClose();
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        const closeOnViewportChange = () => onClose();
        document.addEventListener('mousedown', closeOnOutsidePointer);
        document.addEventListener('keydown', closeOnEscape);
        window.addEventListener('resize', closeOnViewportChange);
        if (!isSheet) document.addEventListener('scroll', closeOnViewportChange, true);

        return () => {
            document.removeEventListener('mousedown', closeOnOutsidePointer);
            document.removeEventListener('keydown', closeOnEscape);
            window.removeEventListener('resize', closeOnViewportChange);
            document.removeEventListener('scroll', closeOnViewportChange, true);
        };
    }, [isSheet, onClose]);

    const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const moves: Record<string, number | 'first' | 'last'> = {
            ArrowDown: 1,
            ArrowUp: -1,
            Home: 'first',
            End: 'last',
        };
        if (event.key in moves) {
            event.preventDefault();
            focusSibling(menuRef.current, moves[event.key]);
        } else if (event.key === 'Tab') {
            onClose();
        }
    };

    const itemClass = isSheet
        ? 'min-h-11 px-4 gap-3 text-sm'
        : 'min-h-8 px-2.5 gap-2 text-sm rounded-md';

    const menu = (
        <div
            ref={menuRef}
            role="menu"
            aria-label={t('CONVERSATION.MESSAGE_ACTIONS.MORE')}
            aria-orientation="vertical"
            onKeyDown={onMenuKeyDown}
            className={isSheet ? 'flex flex-col py-1' : 'flex flex-col p-1 min-w-52'}
        >
            {groups.map((items, index) => (
                <Fragment key={items[0].id}>
                    {index > 0 ? <div role="separator" className="my-1 h-px bg-n-weak" /> : null}
                    {items.map(action => (
                        <button
                            key={action.id}
                            type="button"
                            role="menuitem"
                            tabIndex={-1}
                            data-action={action.id}
                            className={`flex w-full items-center text-start cursor-pointer outline-none transition-colors duration-150 hover:bg-n-alpha-2 focus-visible:bg-n-alpha-2 focus:bg-n-alpha-2 ${itemClass} ${
                                action.group === 'danger' ? 'text-n-ruby-11' : 'text-n-slate-12'
                            }`}
                            onClick={() => onSelect(action.id)}
                        >
                            <Icon icon={action.icon} className="size-4 shrink-0" />
                            <span className="truncate">{labelOf(action)}</span>
                        </button>
                    ))}
                </Fragment>
            ))}
        </div>
    );

    const content = isSheet ? (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div aria-hidden="true" className="absolute inset-0 bg-n-alpha-black1" onClick={onClose} />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={t('CONVERSATION.MESSAGE_ACTIONS.MORE')}
                className="relative rounded-t-2xl border-t border-n-weak bg-n-solid-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-lg"
            >
                <div aria-hidden="true" className="mx-auto mt-2 mb-1 h-1 w-10 rounded-full bg-n-slate-6" />
                {reactions.length > 0 && onReact ? (
                    <div
                        role="group"
                        aria-label={t('CONVERSATION.MESSAGE_ACTIONS.REACT')}
                        className="flex items-center justify-around gap-1 px-3 py-2 border-b border-n-weak"
                    >
                        {reactions.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                aria-label={emoji}
                                className="size-11 grid place-content-center rounded-full text-2xl hover:bg-n-alpha-2 cursor-pointer"
                                onClick={() => onReact(emoji)}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                ) : null}
                {menu}
            </div>
        </div>
    ) : (
        <div
            ref={panelRef}
            style={{ left: position.x, top: position.y }}
            className="fixed z-50 rounded-lg border border-n-weak bg-n-solid-2 shadow-lg"
        >
            {menu}
        </div>
    );

    return createPortal(content, document.body);
}
