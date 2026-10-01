import { useId, useRef, useState } from 'react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, KeyboardEvent, ReactNode } from 'react';

import { cn } from './cn';
import { useDismiss } from './overlay';

const ITEM_CLASS =
    'flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-console-foreground outline-none hover:bg-console-accent focus-visible:bg-console-accent';

function menuItems(menu: HTMLElement | null): HTMLElement[] {
    return menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')) : [];
}

// Menu thả xuống neo vào nút kích hoạt: mũi tên lên/xuống chuyển mục, Esc hoặc bấm
// ra ngoài thì đóng. `children` nhận hàm `close` để mục tự đóng menu sau khi chọn.
export function DropdownMenu({
    trigger,
    label,
    align = 'end',
    triggerClassName,
    className,
    children,
}: {
    trigger: ReactNode;
    label: string;
    align?: 'start' | 'end';
    triggerClassName?: string;
    className?: string;
    children: ReactNode | ((close: () => void) => ReactNode);
}) {
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuId = useId();
    const close = () => setOpen(false);

    useDismiss(open, close, menuRef, [triggerRef]);

    const focusItem = (index: number) => {
        const items = menuItems(menuRef.current);
        if (items.length === 0) return;
        items[(index + items.length) % items.length].focus();
    };

    const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        const items = menuItems(menuRef.current);
        const current = items.indexOf(document.activeElement as HTMLElement);
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusItem(current + 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusItem(current - 1);
        } else if (event.key === 'Home') {
            event.preventDefault();
            focusItem(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            focusItem(items.length - 1);
        } else if (event.key === 'Tab') {
            close();
        }
    };

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                aria-label={label}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                className={triggerClassName}
                onClick={() => {
                    setOpen(value => !value);
                    requestAnimationFrame(() => focusItem(0));
                }}
            >
                {trigger}
            </button>
            {open ? (
                <div
                    ref={menuRef}
                    id={menuId}
                    role="menu"
                    aria-label={label}
                    onKeyDown={handleMenuKeyDown}
                    className={cn(
                        'absolute top-full z-40 mt-2 min-w-48 rounded-md border border-console-border bg-console-card p-1 shadow-lg',
                        align === 'end' ? 'right-0' : 'left-0',
                        className,
                    )}
                >
                    {typeof children === 'function' ? children(close) : children}
                </div>
            ) : null}
        </div>
    );
}

export function DropdownMenuItem({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button type="button" role="menuitem" tabIndex={-1} className={cn(ITEM_CLASS, className)} {...props} />;
}

export function DropdownMenuLink({ className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
    return <a role="menuitem" tabIndex={-1} className={cn(ITEM_CLASS, className)} {...props} />;
}

export function DropdownMenuLabel({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cn('px-2 py-1.5 text-sm', className)}>{children}</div>;
}

export function DropdownMenuSeparator() {
    return <div role="separator" className="-mx-1 my-1 h-px bg-console-border" />;
}
