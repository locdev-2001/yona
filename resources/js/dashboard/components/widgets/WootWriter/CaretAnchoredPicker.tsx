import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { useKeyboardNavigableList } from 'dashboard/composables/useKeyboardNavigableList';
import PreviewPicker from './PreviewPicker';
import type { PreviewLayout, PreviewPickerHandle, PreviewPickerItem } from './PreviewPicker';

// Port từ dashboard/components-next/preview-picker/CaretAnchoredPicker.vue —
// neo popup vào ký tự kích hoạt (`/`) chứ không vào cả ô soạn thảo.
// Khác gốc: chưa có RTL nên `dir` cố định 'ltr' (bản port mới có locale en).

const MIN_HEIGHT = 200;
const MAX_HEIGHT = 360;
const MAX_WIDTH = 768;
const LIST_ONLY_MAX_WIDTH = 420;
const VIEWPORT_MARGIN = 16;
const GAP = 8;
const SIDE_PREVIEW_MIN_WIDTH = 480;
const STACKED_PREVIEW_MIN_HEIGHT = 280;

export interface CaretPosition {
    top: number;
    height: number;
}

interface ElementBounding {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
}

const EMPTY_BOUNDING: ElementBounding = { top: 0, bottom: 0, left: 0, right: 0, width: 0 };

// Thay useElementBounding/useResizeObserver/useWindowSize của @vueuse.
function useElementBounding(element: HTMLElement | null): ElementBounding {
    const [bounding, setBounding] = useState<ElementBounding>(EMPTY_BOUNDING);

    const measure = useCallback(() => {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        setBounding(current =>
            current.top === rect.top &&
            current.bottom === rect.bottom &&
            current.left === rect.left &&
            current.right === rect.right &&
            current.width === rect.width
                ? current
                : { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width },
        );
    }, [element]);

    useLayoutEffect(() => {
        if (!element) return undefined;
        measure();

        const observer = new ResizeObserver(measure);
        observer.observe(element);
        if (element.parentElement) observer.observe(element.parentElement);
        window.addEventListener('scroll', measure, true);
        window.addEventListener('resize', measure);

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', measure, true);
            window.removeEventListener('resize', measure);
        };
    }, [element, measure]);

    return bounding;
}

function useWindowSize(): { width: number; height: number } {
    const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

    useEffect(() => {
        const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return size;
}

/**
 * Vì sao bảng đóng: 'keyboard' (Escape) thì con trỏ vẫn thuộc về ô soạn và phải
 * được trả về đó; 'outside' là người dùng bấm đi chỗ khác — không giành lại focus.
 */
export type PickerCloseReason = 'keyboard' | 'outside';

interface CaretAnchoredPickerProps<TItem extends PreviewPickerItem> {
    caretPosition: CaretPosition | null;
    items: TItem[];
    search: string;
    onSearchChange: (search: string) => void;
    searchPlaceholder?: string;
    emptyLabel?: string;
    isLoading?: boolean;
    onSelect: (item: TItem) => void;
    onClose: (reason: PickerCloseReason) => void;
    onRemoveTrigger: () => void;
    renderPreview?: (item: TItem | undefined) => ReactNode;
    renderLeading?: (item: TItem, isSelected: boolean) => ReactNode;
    renderFilters?: () => ReactNode;
    renderEmpty?: () => ReactNode;
    /**
     * Ô soạn thảo giữ focus: từ khoá là chính ký tự kích hoạt đang gõ, bảng không
     * dựng ô tìm kiếm riêng và để Backspace cho ô soạn thảo (xoá hết ký tự kích
     * hoạt là bảng tự đóng qua onExit của plugin gợi ý).
     */
    keepFocusInEditor?: boolean;
    /**
     * Khối không được che khi bảng bung lên trên (thanh tab Trả lời/Lưu ý riêng
     * nằm ngay trên ô soạn). Vắng mặt thì neo vào chính con trỏ như bản gốc.
     */
    boundaryElement?: HTMLElement | null;
}

export default function CaretAnchoredPicker<TItem extends PreviewPickerItem>({
    caretPosition,
    items,
    search,
    onSearchChange,
    searchPlaceholder = '',
    emptyLabel = '',
    isLoading = false,
    onSelect,
    onClose,
    onRemoveTrigger,
    renderPreview,
    renderLeading,
    renderFilters,
    renderEmpty,
    keepFocusInEditor = false,
    boundaryElement = null,
}: CaretAnchoredPickerProps<TItem>) {
    const [caretAnchorElement, setCaretAnchorElement] = useState<HTMLDivElement | null>(null);
    const pickerRef = useRef<PreviewPickerHandle>(null);
    const pickerHostRef = useRef<HTMLDivElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const caretAnchor = useElementBounding(caretAnchorElement);
    const { width: windowWidth, height: windowHeight } = useWindowSize();

    const hasPreview = Boolean(renderPreview);

    // Mép trên của khối phải chừa chỗ (nếu có) — nếu không thì chính con trỏ.
    const boundaryTop = boundaryElement
        ? Math.min(boundaryElement.getBoundingClientRect().top, caretAnchor.top)
        : caretAnchor.top;

    const above = boundaryTop - VIEWPORT_MARGIN - GAP;
    const below = windowHeight - caretAnchor.bottom - VIEWPORT_MARGIN - GAP;
    const placeAbove = above > below;
    const availableHeight = Math.min(MAX_HEIGHT, Math.max(placeAbove ? above : below, 0));

    const width = Math.min(
        caretAnchor.width,
        hasPreview ? MAX_WIDTH : LIST_ONLY_MAX_WIDTH,
        windowWidth - VIEWPORT_MARGIN * 2,
    );

    const previewLayout: PreviewLayout = !hasPreview
        ? 'none'
        : width >= SIDE_PREVIEW_MIN_WIDTH
          ? 'side'
          : availableHeight >= STACKED_PREVIEW_MIN_HEIGHT
            ? 'stacked'
            : 'none';

    const showsPreview = previewLayout !== 'none';
    const inlineStart = Math.min(caretAnchor.left, windowWidth - width - VIEWPORT_MARGIN);

    const pickerStyle: React.CSSProperties = {
        insetInlineStart: `${Math.max(VIEWPORT_MARGIN, inlineStart)}px`,
        width: `${width}px`,
        maxHeight: `${availableHeight}px`,
        ...(showsPreview ? { minHeight: `${Math.min(MIN_HEIGHT, availableHeight)}px` } : {}),
        ...(placeAbove
            ? { bottom: `${windowHeight - boundaryTop + GAP}px` }
            : { top: `${caretAnchor.bottom + GAP}px` }),
    };

    const adjustScroll = () => pickerRef.current?.scrollSelectedIntoView();

    const selectAtIndex = (index: number) => {
        const item = items[index];
        if (item) onSelect(item);
    };

    useKeyboardNavigableList({
        itemCount: items.length,
        selectedIndex,
        onSelectedIndexChange: setSelectedIndex,
        onSelect: () => selectAtIndex(selectedIndex),
        adjustScroll,
    });

    const withPicker = (action: () => void) => ({
        action: (event: KeyboardEvent) => {
            event.preventDefault();
            action();
        },
        allowOnFocusedInput: true,
    });

    useKeyboardEvents({
        Tab: withPicker(() =>
            setSelectedIndex(current => (items.length ? (current === items.length - 1 ? 0 : current + 1) : current)),
        ),
        'Shift+Tab': withPicker(() =>
            setSelectedIndex(current => (items.length ? (current === 0 ? items.length - 1 : current - 1) : current)),
        ),
        Escape: withPicker(() => onClose('keyboard')),
        // Focus ở ô soạn: Backspace là phím xoá chữ bình thường, xoá hết ký tự
        // kích hoạt thì plugin gợi ý tự đóng bảng — không cướp phím của người gõ.
        ...(keepFocusInEditor
            ? {}
            : {
                  Backspace: {
                      action: (event: KeyboardEvent) => {
                          if (search) return;
                          event.preventDefault();
                          onRemoveTrigger();
                      },
                      allowOnFocusedInput: true,
                  },
              }),
    });

    // v-on-click-outside của gốc.
    useEffect(() => {
        const onPointerDown = (event: MouseEvent) => {
            if (!pickerHostRef.current?.contains(event.target as Node)) onClose('outside');
        };
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [onClose]);

    const itemsKey = items.map(item => item.id).join('|');
    useEffect(() => {
        setSelectedIndex(0);
        adjustScroll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemsKey]);

    return (
        <>
            <div
                ref={setCaretAnchorElement}
                className="absolute inset-x-0 pointer-events-none"
                style={{ top: `${caretPosition?.top ?? 0}px`, height: `${caretPosition?.height ?? 0}px` }}
            />
            {createPortal(
                <div dir="ltr" ref={pickerHostRef}>
                    <PreviewPicker<TItem>
                        ref={pickerRef}
                        items={items}
                        selectedIndex={selectedIndex}
                        onSelectedIndexChange={setSelectedIndex}
                        search={search}
                        onSearchChange={onSearchChange}
                        searchPlaceholder={searchPlaceholder}
                        emptyLabel={emptyLabel}
                        isLoading={isLoading}
                        previewLayout={previewLayout}
                        className="fixed z-[9999]"
                        style={pickerStyle}
                        hideSearch={keepFocusInEditor}
                        onSelect={selectAtIndex}
                        renderPreview={renderPreview}
                        renderLeading={renderLeading}
                        renderFilters={renderFilters}
                        renderEmpty={renderEmpty}
                    />
                </div>,
                document.body,
            )}
        </>
    );
}
