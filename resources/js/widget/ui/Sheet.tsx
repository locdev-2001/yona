import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SheetProps {
    label: string;
    onClose: () => void;
    children: ReactNode;
    /** Sheet phủ gần kín khung (trang công khai); mặc định cao theo nội dung. */
    tall?: boolean;
}

/**
 * Tấm trượt từ đáy khung chat: nền mờ bấm để đóng, thanh kéo, Esc đóng. Vẽ ra body
 * vì luồng tin và ô nhập là hai lớp xếp chồng riêng, tấm nằm trong luồng tin sẽ bị
 * ô nhập đè.
 */
export default function Sheet({ label, onClose, children, tall = false }: SheetProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        panelRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);

        return () => {
            document.removeEventListener('keydown', onKey);
            previous?.focus?.();
        };
    }, [onClose]);

    return createPortal(
        <div className="yona-sheet fixed inset-0 z-50 bg-[var(--yona-chat-scrim-soft)]" onClick={onClose}>
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                className={`absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[24px] bg-[var(--yona-chat-panel)] shadow-[var(--yona-chat-shadow-pop)] outline-none ${
                    tall ? 'top-[10%]' : 'max-h-[92%]'
                }`}
                onClick={event => event.stopPropagation()}
            >
                <span aria-hidden="true" className="mx-auto mt-2 h-1 w-9 flex-none rounded-full bg-[var(--yona-chat-line-field)]" />
                {children}
            </div>
        </div>,
        document.body,
    );
}

export function SheetCloseButton({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className="flex size-9 flex-none items-center justify-center rounded-full bg-[var(--yona-chat-field)] text-[var(--yona-chat-ink)] active:scale-95"
            onClick={onClick}
        >
            <span className="i-lucide-x size-[18px]" />
        </button>
    );
}
