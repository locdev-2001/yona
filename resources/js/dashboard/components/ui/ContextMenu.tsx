import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { FocusEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Port từ dashboard/components/ui/ContextMenu.vue — khung menu chuột phải dùng
// chung (định vị trong khung nhìn + đóng khi mất tiêu điểm). Nội dung do nơi gọi
// truyền vào như slot của bản gốc.

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

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: ReactNode;
}

export default function ContextMenu({ x, y, onClose, children }: ContextMenuProps): ReactNode {
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

    // data-popover-content: menu là một lớp nổi lồng, bấm trong menu không phải
    // "bấm ra ngoài" với Popover hay ngăn kéo sidebar đang mở bên dưới.
    return createPortal(
        <div
            ref={menuRef}
            data-popover-content=""
            className="fixed outline-none z-[9999] cursor-pointer"
            style={{ left: `${position.left}px`, top: `${position.top}px` }}
            tabIndex={0}
            onBlur={handleFocusOut}
        >
            {children}
        </div>,
        document.body,
    );
}
