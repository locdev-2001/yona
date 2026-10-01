import { useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cn } from './cn';
import { useDismiss, useFocusTrap, useScrollLock } from './overlay';

// Ngăn trượt từ cạnh trái (sidebar trên điện thoại).
export function Sheet({
    open,
    onOpenChange,
    label,
    children,
    className,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    label: string;
    children: ReactNode;
    className?: string;
}) {
    const panelRef = useRef<HTMLDivElement>(null);

    useDismiss(open, () => onOpenChange(false), panelRef);
    useFocusTrap(open, panelRef);
    useScrollLock(open);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50">
            <div aria-hidden="true" className="absolute inset-0 bg-console-overlay/40" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                className={cn(
                    'absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-console-slide-in flex-col bg-console-sidebar shadow-xl outline-none',
                    className,
                )}
            >
                {children}
            </div>
        </div>,
        document.body,
    );
}
