import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, TouchEvent as ReactTouchEvent } from 'react';

// Port từ dashboard/components/widgets/conversation/ResizableEditorWrapper.vue:
// kéo thanh grip đổi chiều cao editor, dblclick về mặc định, toggleEditorExpand
// cho nút ⤢ trên ReplyTopPanel, reset sau khi gửi tin. Bỏ: `requestEditorHeight`
// (chỉ CopilotEditor dùng — nhóm captain sau).
const DEFAULT_HEIGHT = 120;
const MIN_HEIGHT = 80;
const MIN_MESSAGES_HEIGHT = 200;
const EXPAND_RATIO = 0.5;
const RESET_DELAY_MS = 120;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export interface ResizableEditorWrapperHandle {
    toggleEditorExpand: () => void;
    resetEditorHeight: () => void;
    scheduleResetAfterSend: () => void;
}

interface ResizableEditorWrapperProps {
    containerHeight?: number;
    children: ReactNode;
}

const ResizableEditorWrapper = forwardRef<ResizableEditorWrapperHandle, ResizableEditorWrapperProps>(
    function ResizableEditorWrapper({ containerHeight = 0, children }, ref) {
        const wrapperRef = useRef<HTMLDivElement>(null);
        const [surroundingHeight, setSurroundingHeight] = useState(0);
        const [editorHeight, setEditorHeight] = useState(DEFAULT_HEIGHT);
        const [isResizing, setIsResizing] = useState(false);
        const dragStart = useRef({ y: 0, height: 0 });
        const resetTimeout = useRef<number | undefined>(undefined);

        const sizeBounds = useMemo(() => {
            const max = Math.max(MIN_HEIGHT, containerHeight - MIN_MESSAGES_HEIGHT - surroundingHeight);
            const expanded = clamp(
                Math.floor(containerHeight * EXPAND_RATIO - surroundingHeight / 2),
                MIN_HEIGHT,
                max,
            );
            return {
                min: MIN_HEIGHT,
                max: containerHeight > 0 ? max : DEFAULT_HEIGHT,
                expanded,
                default: clamp(DEFAULT_HEIGHT, MIN_HEIGHT, max),
            };
        }, [containerHeight, surroundingHeight]);

        const appliedHeight = clamp(editorHeight, sizeBounds.min, sizeBounds.max);
        const appliedHeightRef = useRef(appliedHeight);
        appliedHeightRef.current = appliedHeight;
        const sizeBoundsRef = useRef(sizeBounds);
        sizeBoundsRef.current = sizeBounds;

        // Đo phần bao quanh editor (top panel + bottom panel) để trừ khỏi giới hạn.
        const measureSurroundingHeight = useCallback(() => {
            if (!wrapperRef.current) return;
            setSurroundingHeight(Math.max(0, wrapperRef.current.offsetHeight - appliedHeightRef.current));
        }, []);

        const clampToBounds = (value: number) =>
            clamp(value, sizeBoundsRef.current.min, sizeBoundsRef.current.max);

        const resetEditorHeight = useCallback(() => {
            setEditorHeight(sizeBoundsRef.current.default);
        }, []);

        const toggleEditorExpand = useCallback(() => {
            measureSurroundingHeight();
            const { expanded, max, default: defaultHeight } = sizeBoundsRef.current;
            const isExpanded = appliedHeightRef.current > defaultHeight;
            // Nếu expanded quá gần default thì dùng max để thấy rõ thay đổi.
            const target = expanded - defaultHeight < 100 ? max : expanded;
            setEditorHeight(isExpanded ? defaultHeight : target);
        }, [measureSurroundingHeight]);

        const scheduleResetAfterSend = useCallback(() => {
            window.clearTimeout(resetTimeout.current);
            resetTimeout.current = window.setTimeout(resetEditorHeight, RESET_DELAY_MS);
        }, [resetEditorHeight]);

        useImperativeHandle(ref, () => ({ toggleEditorExpand, resetEditorHeight, scheduleResetAfterSend }), [
            toggleEditorExpand,
            resetEditorHeight,
            scheduleResetAfterSend,
        ]);

        const getClientY = (event: MouseEvent | TouchEvent | ReactMouseEvent | ReactTouchEvent) =>
            'touches' in event ? event.touches[0].clientY : event.clientY;

        const onResizeStart = (event: ReactMouseEvent | ReactTouchEvent) => {
            measureSurroundingHeight();
            setIsResizing(true);
            dragStart.current = { y: getClientY(event), height: appliedHeightRef.current };
            setEditorHeight(appliedHeightRef.current);
            Object.assign(document.body.style, { cursor: 'row-resize', userSelect: 'none' });
        };

        useEffect(() => {
            if (!isResizing) return undefined;

            const onMove = (event: MouseEvent | TouchEvent) => {
                if ('touches' in event) event.preventDefault();
                setEditorHeight(clampToBounds(dragStart.current.height + dragStart.current.y - getClientY(event)));
            };
            const onEnd = () => {
                setIsResizing(false);
                Object.assign(document.body.style, { cursor: '', userSelect: '' });
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onEnd);
            document.addEventListener('touchmove', onMove, { passive: false });
            document.addEventListener('touchend', onEnd);
            document.addEventListener('touchcancel', onEnd);
            window.addEventListener('blur', onEnd);
            return () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);
                document.removeEventListener('touchcancel', onEnd);
                window.removeEventListener('blur', onEnd);
                Object.assign(document.body.style, { cursor: '', userSelect: '' });
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [isResizing]);

        useEffect(() => () => window.clearTimeout(resetTimeout.current), []);

        const style = {
            '--editor-height': `${appliedHeight}px`,
            '--editor-min-allowed': `${sizeBounds.min}px`,
            '--editor-max-allowed': `${sizeBounds.max}px`,
            '--editor-height-transition': isResizing ? '0s' : '200ms cubic-bezier(0.4, 0, 0.2, 1)',
        } as CSSProperties;

        return (
            <div ref={wrapperRef} className="relative resizable-editor-wrapper" style={style}>
                <div
                    className="group absolute inset-x-0 -top-4 z-10 flex h-4 cursor-row-resize select-none items-center justify-center bg-gradient-to-b from-transparent from-10% dark:to-n-surface-1/80 to-n-surface-1/90 backdrop-blur-[0.01875rem]"
                    onMouseDown={onResizeStart}
                    onTouchStart={event => {
                        event.preventDefault();
                        onResizeStart(event);
                    }}
                    onDoubleClick={resetEditorHeight}
                >
                    <div
                        className={`w-8 h-0.5 mt-1 rounded-full bg-n-slate-6 group-hover:bg-n-slate-8 transition-all duration-200 motion-safe:group-hover:animate-bounce ${
                            isResizing ? 'bg-n-slate-8 animate-bounce' : ''
                        }`}
                    />
                </div>
                {children}
            </div>
        );
    },
);

export default ResizableEditorWrapper;
