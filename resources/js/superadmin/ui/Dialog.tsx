import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from './Button';
import type { ButtonVariant } from './Button';
import { cn } from './cn';
import { Icon } from './Icon';
import { useConsoleLabels } from './labels';
import { useDismiss, useFocusTrap, useScrollLock } from './overlay';

export function Dialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    footer,
    className,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    footer?: ReactNode;
    className?: string;
}) {
    const label = useConsoleLabels();
    const panelRef = useRef<HTMLDivElement>(null);
    const titleId = useId();
    const descriptionId = useId();

    useDismiss(open, () => onOpenChange(false), panelRef);
    useFocusTrap(open, panelRef);
    useScrollLock(open);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div aria-hidden="true" className="absolute inset-0 bg-console-overlay/40" />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                tabIndex={-1}
                className={cn(
                    'relative flex w-full max-w-md flex-col gap-4 rounded-xl border border-console-border bg-console-card p-6 text-sm text-console-foreground shadow-xl outline-none',
                    className,
                )}
            >
                <div className="flex flex-col gap-1.5 pr-6">
                    <h2 id={titleId} className="text-base font-semibold">
                        {title}
                    </h2>
                    {description ? (
                        <p id={descriptionId} className="text-console-muted-foreground">
                            {description}
                        </p>
                    ) : null}
                </div>
                {children}
                {footer ? <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div> : null}
                <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={label('close')}
                    className="absolute right-3 top-3"
                    onClick={() => onOpenChange(false)}
                >
                    <Icon name="i-lucide-x" />
                </Button>
            </div>
        </div>,
        document.body,
    );
}

// Hộp xác nhận cho thao tác ghi: nút xác nhận mặc định kiểu destructive.
export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel,
    cancelLabel,
    confirmVariant = 'destructive',
    pending = false,
    onConfirm,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    confirmVariant?: ButtonVariant;
    pending?: boolean;
    onConfirm: () => void;
    children?: ReactNode;
}) {
    const label = useConsoleLabels();

    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
            title={title}
            description={description}
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                        {cancelLabel ?? label('cancel')}
                    </Button>
                    <Button variant={confirmVariant} onClick={onConfirm} disabled={pending}>
                        {confirmLabel ?? label('confirm')}
                    </Button>
                </>
            }
        >
            {children}
        </Dialog>
    );
}
