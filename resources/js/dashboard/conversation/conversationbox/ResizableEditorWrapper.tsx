import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, TouchEvent as ReactTouchEvent } from 'react';

import { t } from '../../../i18n';
import { useConversation } from '../ConversationContext';
import {
    COMPOSER_HEIGHT_KEY,
    COMPOSER_MIN_HEIGHT,
    composerSizeBounds,
    readStoredComposerHeight,
    resolveComposerHeight,
} from '../composerHeight';

// Port từ dashboard/components/widgets/conversation/ResizableEditorWrapper.vue:
// kéo thanh grip đổi chiều cao editor, dblclick về mặc định, toggleEditorExpand
// cho nút ⤢ trên ReplyTopPanel. Bỏ: `requestEditorHeight` qua provide/inject —
// thay bằng phép ĐO nội dung thật ở đây, nên mọi editor cắm vào wrapper đều tự
// giãn mà không phải tự khai báo chiều cao.
//
// Công thức chiều cao nằm trọn trong `../composerHeight` (logic thuần, có test).
const RESET_DELAY_MS = 120;
const EDITOR_BODY_SELECTOR = '.resizable-editor-body';

export interface ResizableEditorWrapperHandle {
    toggleEditorExpand: () => void;
    resetEditorHeight: () => void;
    scheduleResetAfterSend: () => void;
}

interface ResizableEditorWrapperProps {
    containerHeight?: number;
    children: ReactNode;
}

/**
 * Chiều cao nội dung thật của editor. KHÔNG dùng `scrollHeight`: ô soạn bị ghim
 * chiều cao nên `scrollHeight` không bao giờ nhỏ hơn chiều cao đang áp, ô soạn sẽ
 * không co lại được sau khi xoá chữ.
 */
function measureContentHeight(body: HTMLElement): number {
    const blocks = body.children;
    if (!blocks.length) return 0;

    const first = blocks[0].getBoundingClientRect();
    const last = blocks[blocks.length - 1].getBoundingClientRect();
    const styles = window.getComputedStyle(body);
    const padding = parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');

    return Math.ceil(last.bottom - first.top + padding);
}

const ResizableEditorWrapper = forwardRef<ResizableEditorWrapperHandle, ResizableEditorWrapperProps>(
    function ResizableEditorWrapper({ containerHeight = 0, children }, ref) {
        const { uiSettings, updateUISettings } = useConversation();
        const wrapperRef = useRef<HTMLDivElement>(null);
        const [surroundingHeight, setSurroundingHeight] = useState(0);
        const [contentHeight, setContentHeight] = useState(0);
        const [pinnedHeight, setPinnedHeight] = useState<number | null>(() => readStoredComposerHeight(uiSettings));
        const [isResizing, setIsResizing] = useState(false);
        const dragStart = useRef({ y: 0, height: 0 });
        const updateUISettingsRef = useRef(updateUISettings);
        updateUISettingsRef.current = updateUISettings;
        const resetTimeout = useRef<number | undefined>(undefined);

        // Chiều cao đã ghim đến từ hồ sơ người dùng: lần đầu `ui_settings` về sau
        // khi wrapper đã dựng thì phải nhận lại, nhưng không được đè lên thao tác
        // kéo đang diễn ra trong phiên.
        const storedHeight = readStoredComposerHeight(uiSettings);
        const hasLocalPin = useRef(false);
        useEffect(() => {
            if (hasLocalPin.current) return;
            setPinnedHeight(storedHeight);
        }, [storedHeight]);

        const sizeBounds = useMemo(
            () => composerSizeBounds(containerHeight, surroundingHeight),
            [containerHeight, surroundingHeight],
        );

        const appliedHeight = resolveComposerHeight({ pinnedHeight, contentHeight, bounds: sizeBounds });
        const appliedHeightRef = useRef(appliedHeight);
        appliedHeightRef.current = appliedHeight;
        const sizeBoundsRef = useRef(sizeBounds);
        sizeBoundsRef.current = sizeBounds;

        // Đo phần bao quanh editor (top panel + bottom panel) để trừ khỏi giới hạn.
        const measureSurroundingHeight = useCallback(() => {
            if (!wrapperRef.current) return;
            setSurroundingHeight(Math.max(0, wrapperRef.current.offsetHeight - appliedHeightRef.current));
        }, []);

        // Nội dung editor đổi (gõ, dán, xoá, đổi hội thoại, đổi bề rộng khung) →
        // đo lại. MutationObserver đặt trên cả wrapper nên EditorView bị dựng lại
        // khi đổi hội thoại/chế độ cũng được bắt mà không phải nối ref thủ công.
        useEffect(() => {
            const wrapper = wrapperRef.current;
            if (!wrapper) return undefined;

            let frame = 0;
            const remeasure = () => {
                window.cancelAnimationFrame(frame);
                frame = window.requestAnimationFrame(() => {
                    const body = wrapper.querySelector<HTMLElement>(EDITOR_BODY_SELECTOR);
                    setContentHeight(body ? measureContentHeight(body) : 0);
                    setSurroundingHeight(Math.max(0, wrapper.offsetHeight - appliedHeightRef.current));
                });
            };

            const mutations = new MutationObserver(remeasure);
            mutations.observe(wrapper, { childList: true, subtree: true, characterData: true });
            const resizes = new ResizeObserver(remeasure);
            resizes.observe(wrapper);
            remeasure();

            return () => {
                window.cancelAnimationFrame(frame);
                mutations.disconnect();
                resizes.disconnect();
            };
        }, []);

        const pinHeight = useCallback(
            (height: number | null) => {
                hasLocalPin.current = true;
                setPinnedHeight(height);
                updateUISettings({ [COMPOSER_HEIGHT_KEY]: height ?? 0 });
            },
            [updateUISettings],
        );

        // Về mặc định = bỏ ghim, để nội dung tự quyết chiều cao.
        const resetEditorHeight = useCallback(() => pinHeight(null), [pinHeight]);

        const toggleEditorExpand = useCallback(() => {
            measureSurroundingHeight();
            const { expanded, max } = sizeBoundsRef.current;
            const target = Math.max(expanded, Math.min(max, sizeBoundsRef.current.autoGrowMax));
            if (appliedHeightRef.current >= target) {
                resetEditorHeight();
                return;
            }
            pinHeight(target);
        }, [measureSurroundingHeight, pinHeight, resetEditorHeight]);

        // Gửi xong thì ô soạn co về mặc định — nội dung đã rỗng nên chỉ cần bỏ ghim.
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
            hasLocalPin.current = true;
            setPinnedHeight(appliedHeightRef.current);
            Object.assign(document.body.style, { cursor: 'row-resize', userSelect: 'none' });
        };

        useEffect(() => {
            if (!isResizing) return undefined;

            const onMove = (event: MouseEvent | TouchEvent) => {
                if ('touches' in event) event.preventDefault();
                const { min, max } = sizeBoundsRef.current;
                const next = dragStart.current.height + dragStart.current.y - getClientY(event);
                setPinnedHeight(Math.min(Math.max(next, min), max));
            };
            const onEnd = () => {
                setIsResizing(false);
                Object.assign(document.body.style, { cursor: '', userSelect: '' });
                // Ghi chiều cao vừa kéo vào hồ sơ — tải lại trang vẫn giữ.
                updateUISettingsRef.current({ [COMPOSER_HEIGHT_KEY]: appliedHeightRef.current });
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
            '--editor-min-allowed': `${COMPOSER_MIN_HEIGHT}px`,
            '--editor-max-allowed': `${sizeBounds.max}px`,
            '--editor-height-transition': isResizing ? '0s' : '150ms cubic-bezier(0.4, 0, 0.2, 1)',
        } as CSSProperties;

        return (
            <div ref={wrapperRef} className="relative resizable-editor-wrapper" style={style}>
                <div
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label={t('CONVERSATION.FOOTER.RESIZE_COMPOSER')}
                    data-testid="composer-resize-grip"
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
