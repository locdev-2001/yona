import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

// Esc và bấm ra ngoài `containerRef` thì đóng. `ignoreRefs` là các phần tử bấm vào
// không tính là "ra ngoài" (vd. nút mở menu).
export function useDismiss(
    open: boolean,
    onDismiss: () => void,
    containerRef: RefObject<HTMLElement | null>,
    ignoreRefs: RefObject<HTMLElement | null>[] = [],
): void {
    const dismissRef = useRef(onDismiss);
    dismissRef.current = onDismiss;

    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                dismissRef.current();
            }
        };
        const handlePointerDown = (event: PointerEvent | MouseEvent) => {
            const target = event.target as Node;
            const insideIgnored = ignoreRefs.some(ref => ref.current?.contains(target));
            if (!insideIgnored && containerRef.current && !containerRef.current.contains(target)) {
                dismissRef.current();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handlePointerDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handlePointerDown);
        };
        // ignoreRefs chứa ref ổn định; chỉ cần gắn lại khi mở/đóng.
    }, [open, containerRef]);
}

// Hộp thoại modal: đưa focus vào trong khi mở, giữ Tab quanh quẩn bên trong, trả
// focus về chỗ cũ khi đóng.
export function useFocusTrap(open: boolean, containerRef: RefObject<HTMLElement | null>): void {
    useEffect(() => {
        const container = containerRef.current;
        if (!open || !container) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const autoFocusTarget = container.querySelector<HTMLElement>('[autofocus], [data-autofocus]');
        (autoFocusTarget ?? focusableIn(container)[0] ?? container).focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return;
            const focusable = focusableIn(container);
            if (focusable.length === 0) {
                event.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
            previouslyFocused?.focus?.();
        };
    }, [open, containerRef]);
}

// Khoá cuộn trang nền khi có lớp phủ.
export function useScrollLock(locked: boolean): void {
    useEffect(() => {
        if (!locked) return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [locked]);
}
