import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';

// Port từ dashboard/components/Modal.vue — giữ nguyên class + hành vi đóng
// (Esc, mousedown lên backdrop rồi mouseup mới đóng). Transition modal-fade
// của Vue không có tương đương thẳng; Chatwoot cũng không khai báo transition
// đó trong scss, nên bỏ.
interface ModalProps {
    show: boolean;
    onClose: () => void;
    closeOnBackdropClick?: boolean;
    showCloseButton?: boolean;
    fullWidth?: boolean;
    modalType?: 'centered' | 'right-aligned';
    size?: string;
    // class truyền từ nơi gọi (fallthrough attribute của Vue) — dán lên lớp nền.
    className?: string;
    children: ReactNode;
}

export default function Modal({
    show,
    onClose,
    closeOnBackdropClick = true,
    showCloseButton = true,
    fullWidth = false,
    modalType = 'centered',
    size = '',
    className = '',
    children,
}: ModalProps) {
    const mousedDownOnBackdrop = useRef(false);

    useEffect(() => {
        if (!show) return undefined;

        const onKeydown = (event: KeyboardEvent) => {
            if (event.code === 'Escape') {
                onClose();
                event.stopPropagation();
            }
        };

        const onMouseUp = () => {
            if (mousedDownOnBackdrop.current) {
                mousedDownOnBackdrop.current = false;
                if (closeOnBackdropClick) onClose();
            }
        };

        document.addEventListener('keydown', onKeydown);
        document.body.addEventListener('mouseup', onMouseUp);

        return () => {
            document.removeEventListener('keydown', onKeydown);
            document.body.removeEventListener('mouseup', onMouseUp);
        };
    }, [show, closeOnBackdropClick, onClose]);

    if (!show) return null;

    const containerClasses = [
        'relative max-h-full overflow-auto bg-n-alpha-3 shadow-md modal-container rtl:text-right skip-context-menu',
        fullWidth ? 'items-center rounded-none flex h-full justify-center w-full' : 'rounded-xl w-[37.5rem]',
        size,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <div
            className={`modal-mask skip-context-menu ${modalType === 'right-aligned' ? 'right-aligned' : ''} ${className}`}
            onMouseDown={() => {
                mousedDownOnBackdrop.current = true;
            }}
        >
            <div className={containerClasses} onMouseDown={event => event.stopPropagation()}>
                {showCloseButton ? (
                    <Button
                        ghost
                        slate
                        icon="i-lucide-x"
                        className="absolute z-10 ltr:right-2 rtl:left-2 top-2"
                        onClick={onClose}
                    />
                ) : null}
                {children}
            </div>
        </div>
    );
}
