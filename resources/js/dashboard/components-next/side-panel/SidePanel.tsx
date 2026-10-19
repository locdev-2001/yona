import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import Button from 'dashboard/components-next/button/Button';
import { t } from '../../../i18n';

// Port từ dashboard/components-next/side-panel/SidePanel.vue — bảng trượt từ
// cạnh phải, dùng chung cho automation rule, template preview, report drilldown.
export type SidePanelWidth = 'md' | 'lg' | 'xl' | '2xl' | '3xl';

interface SidePanelProps {
    open: boolean;
    title?: string;
    description?: string;
    width?: SidePanelWidth;
    closeOnClickOutside?: boolean;
    header?: ReactNode;
    headerActions?: ReactNode;
    footer?: ReactNode;
    children?: ReactNode;
    onClose: () => void;
}

const MAX_WIDTH_CLASSES: Record<SidePanelWidth, string> = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
};

export default function SidePanel({
    open,
    title = '',
    description = '',
    width = 'xl',
    closeOnClickOutside = true,
    header,
    headerActions,
    footer,
    children,
    onClose,
}: SidePanelProps) {
    const panelRef = useRef<HTMLElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // Khoá cuộn trang + đưa focus vào panel khi mở; trả focus về nút đã bấm khi đóng.
    useEffect(() => {
        if (!open) return undefined;
        previousActiveElement.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        panelRef.current?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            // Dialog mở đè lên panel (vd. prompt chèn link của editor) tự xử lý Escape.
            if (document.querySelector('dialog[open]')) return;
            event.preventDefault();
            onClose();
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
            if (previousActiveElement.current?.isConnected) previousActiveElement.current.focus();
            previousActiveElement.current = null;
        };
    }, [open, onClose]);

    if (!open) return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-50 bg-n-alpha-black1"
                role="presentation"
                onClick={() => closeOnClickOutside && onClose()}
            />
            <aside
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                tabIndex={-1}
                className={`fixed z-50 flex flex-col w-[calc(100%-1.5rem)] overflow-hidden rounded-xl overlay-surface inset-y-3 end-3 will-change-transform ${MAX_WIDTH_CLASSES[width]}`}
            >
                <header className={`flex justify-between flex-shrink-0 gap-4 px-6 py-5 ${header ? 'items-start' : 'items-center'}`}>
                    {header ?? (
                        <div className="min-w-0">
                            <h3 className="text-base font-medium truncate text-n-slate-12">{title}</h3>
                            {description ? <p className="mt-1 mb-0 text-sm text-n-slate-11">{description}</p> : null}
                        </div>
                    )}
                    <div className="flex items-center gap-1 shrink-0 -me-2">
                        {headerActions}
                        <Button ghost slate sm icon="i-lucide-x" aria-label={t('GENERAL.CLOSE')} onClick={onClose} />
                    </div>
                </header>
                <div className="flex-1 min-h-0 px-6 py-5 overflow-y-auto">{children}</div>
                {footer ? <footer className="flex-shrink-0 px-6 py-4 bg-n-surface-canvas">{footer}</footer> : null}
            </aside>
        </>,
        document.body,
    );
}
