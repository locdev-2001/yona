import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Port từ components-next/popover/Popover.vue — trigger inline + nội dung
// teleport ra body: desktop = fixed cạnh trigger (useDropdownPosition: dưới
// trigger, lật lên khi thiếu chỗ; align start/end), mobile (< md) = modal giữa
// màn có backdrop. Đóng: click ngoài (bỏ qua [data-popover-content] lồng),
// Escape, cuộn trang quá 24px.
const MD_BREAKPOINT = 768;
const SCROLL_CLOSE_THRESHOLD = 24;
const VIEWPORT_MARGIN = 8;

export interface PopoverHandle {
    show: () => void;
    hide: () => void;
    toggle: () => void;
}

interface PopoverProps {
    align?: 'start' | 'end';
    disableMobileView?: boolean;
    closeOnScroll?: boolean;
    triggerClassName?: string;
    onShow?: () => void;
    onHide?: () => void;
    trigger: (context: { isOpen: boolean }) => ReactNode;
    content: (context: { hide: () => void }) => ReactNode;
}

const Popover = forwardRef<PopoverHandle, PopoverProps>(function Popover(
    { align = 'end', disableMobileView = false, closeOnScroll = true, triggerClassName = 'inline-flex', onShow, onHide, trigger, content },
    ref,
) {
    const [isActive, setIsActive] = useState(false);
    const [isMobile, setIsMobile] = useState(() => !disableMobileView && window.innerWidth < MD_BREAKPOINT);
    const [style, setStyle] = useState<CSSProperties>({ visibility: 'hidden' });
    const triggerRef = useRef<HTMLSpanElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const triggerTopAtOpen = useRef(0);

    const hide = useCallback(() => {
        setIsActive(current => {
            if (current) onHide?.();
            return false;
        });
    }, [onHide]);

    const show = useCallback(() => {
        triggerTopAtOpen.current = triggerRef.current?.getBoundingClientRect().top ?? 0;
        setIsActive(true);
        onShow?.();
    }, [onShow]);

    const toggle = useCallback(() => {
        if (isActive) hide();
        else show();
    }, [isActive, hide, show]);

    useImperativeHandle(ref, () => ({ show, hide, toggle }), [show, hide, toggle]);

    useEffect(() => {
        const onResize = () => setIsMobile(!disableMobileView && window.innerWidth < MD_BREAKPOINT);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [disableMobileView]);

    const showPopover = isActive && !isMobile;

    const updatePosition = useCallback(() => {
        const triggerRect = triggerRef.current?.getBoundingClientRect();
        const popover = popoverRef.current;
        if (!triggerRect || !popover) return;
        const { height, width } = popover.getBoundingClientRect();
        const spaceBelow = window.innerHeight - triggerRect.bottom;
        const openAbove = spaceBelow < height + VIEWPORT_MARGIN && triggerRect.top > spaceBelow;
        const top = openAbove ? Math.max(VIEWPORT_MARGIN, triggerRect.top - height - 4) : triggerRect.bottom + 4;
        let left = align === 'end' ? triggerRect.right - width : triggerRect.left;
        left = Math.min(Math.max(VIEWPORT_MARGIN, left), window.innerWidth - width - VIEWPORT_MARGIN);
        setStyle({ position: 'fixed', top: `${top}px`, left: `${left}px`, zIndex: 9999, visibility: 'visible' });
    }, [align]);

    useLayoutEffect(() => {
        if (!showPopover) {
            setStyle({ visibility: 'hidden' });
            return undefined;
        }
        updatePosition();
        const observer = new ResizeObserver(updatePosition);
        if (popoverRef.current) observer.observe(popoverRef.current);
        return () => observer.disconnect();
    }, [showPopover, updatePosition]);

    useEffect(() => {
        if (!isActive) return undefined;

        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (triggerRef.current?.contains(target)) return;
            if (popoverRef.current?.contains(target)) return;
            if (target.closest('dialog.ProseMirror-prompt-backdrop, [data-popover-content]')) return;
            hide();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            const overlay = (event.target as HTMLElement | null)?.closest?.('dialog.ProseMirror-prompt-backdrop, [data-popover-content]');
            if (overlay && overlay !== popoverRef.current) return;
            hide();
        };
        const onScroll = (event: Event) => {
            if (!closeOnScroll || !showPopover) return;
            if (popoverRef.current?.contains(event.target as Node)) return;
            const top = triggerRef.current?.getBoundingClientRect().top ?? 0;
            if (Math.abs(top - triggerTopAtOpen.current) > SCROLL_CLOSE_THRESHOLD) hide();
        };

        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', onScroll, { capture: true, passive: true });
        return () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', onScroll, { capture: true });
        };
    }, [isActive, showPopover, closeOnScroll, hide]);

    return (
        <>
            <span ref={triggerRef} className={triggerClassName} onClick={toggle}>
                {trigger({ isOpen: isActive })}
            </span>
            {isActive && isMobile
                ? createPortal(
                      <div
                          data-popover-backdrop=""
                          className="fixed inset-0 z-[9999] flex items-start pt-[clamp(3rem,15vh,12rem)] justify-center bg-n-alpha-black1"
                      >
                          <div
                              ref={popoverRef}
                              data-popover-content=""
                              className="relative flex flex-col w-full min-w-0 max-w-lg max-h-[calc(100vh-4rem)] mx-4 overlay-surface rounded-xl"
                          >
                              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-xl">{content({ hide })}</div>
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
            {showPopover
                ? createPortal(
                      <div
                          ref={popoverRef}
                          data-popover-content=""
                          style={style}
                          className="flex flex-col overlay-surface rounded-xl"
                      >
                          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-xl">
                              {content({ hide })}
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
});

export default Popover;
