import { Fragment, forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';
import type { ReactNode } from 'react';
import DOMPurify from 'dompurify';

import Icon from 'dashboard/components-next/icon/Icon';
import Spinner from 'dashboard/components-next/spinner/Spinner';

// Port từ dashboard/components-next/preview-picker/PreviewPicker.vue.
// Đặt trong WootWriter/ (thay vì components-next/preview-picker/) theo ranh giới
// file của tính năng B10; khi port thêm picker mention/variable/emoji thì tách ra.

export interface PreviewPickerItem {
    id: string | number;
    // title/subtitle là HTML đã tô sáng từ khoá tìm kiếm (gốc dùng v-dompurify-html).
    title: string;
    subtitle?: string;
    label?: string;
    group?: string;
}

export type PreviewLayout = 'side' | 'stacked' | 'none';

export interface PreviewPickerHandle {
    scrollSelectedIntoView: () => void;
}

interface PreviewPickerProps<TItem extends PreviewPickerItem> {
    items: TItem[];
    selectedIndex: number;
    onSelectedIndexChange: (index: number) => void;
    search: string;
    onSearchChange: (search: string) => void;
    searchPlaceholder?: string;
    emptyLabel?: string;
    isLoading?: boolean;
    previewLayout?: PreviewLayout;
    className?: string;
    style?: React.CSSProperties;
    /** Ô soạn thảo giữ focus và tự lọc — bảng không dựng ô tìm kiếm riêng. */
    hideSearch?: boolean;
    onSelect: (index: number) => void;
    renderPreview?: (item: TItem | undefined) => ReactNode;
    renderLeading?: (item: TItem, isSelected: boolean) => ReactNode;
    renderFilters?: () => ReactNode;
    renderEmpty?: () => ReactNode;
}

function PreviewPickerInner<TItem extends PreviewPickerItem>(
    {
        items,
        selectedIndex,
        onSelectedIndexChange,
        search,
        onSearchChange,
        searchPlaceholder = '',
        emptyLabel = '',
        isLoading = false,
        previewLayout = 'side',
        className = '',
        style,
        hideSearch = false,
        onSelect,
        renderPreview,
        renderLeading,
        renderFilters,
        renderEmpty,
    }: PreviewPickerProps<TItem>,
    ref: React.ForwardedRef<PreviewPickerHandle>,
) {
    const listRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listboxId = useId();
    const optionId = (index: number) => `${listboxId}-${index}`;

    const selectedItem = items[selectedIndex];
    const isStacked = previewLayout === 'stacked';
    const hasPreview = previewLayout !== 'none' && items.length > 0;

    const listClass = !hasPreview
        ? 'w-full'
        : isStacked
          ? 'w-full flex-1'
          : 'w-2/5 flex-shrink-0 border-r rtl:border-r-0 rtl:border-l border-n-strong';

    const previewClass = isStacked ? 'h-28 flex-shrink-0 border-t border-n-strong' : 'flex-1';

    // Cuộn chính danh sách: scrollIntoView sẽ cuộn cả tổ tiên bị cắt, làm thẻ nhảy
    // dưới con trỏ đứng yên và mouseover nhấp nháy giữa các hàng.
    const scrollSelectedIntoView = () => {
        window.requestAnimationFrame(() => {
            const list = listRef.current;
            const item = list?.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
            if (!list || !item) return;

            const listRect = list.getBoundingClientRect();
            const itemRect = item.getBoundingClientRect();

            if (itemRect.top < listRect.top) {
                list.scrollTop -= listRect.top - itemRect.top;
            } else if (itemRect.bottom > listRect.bottom) {
                list.scrollTop += itemRect.bottom - listRect.bottom;
            }
        });
    };

    useImperativeHandle(ref, () => ({ scrollSelectedIntoView }));

    useEffect(() => {
        if (!hideSearch) searchRef.current?.focus();
    }, [hideSearch]);

    const groupFor = (index: number): string | null => {
        const { group } = items[index];
        return group && group !== items[index - 1]?.group ? group : null;
    };

    return (
        <div
            className={`flex overflow-hidden border shadow-lg rounded-xl border-n-strong bg-n-alpha-3 backdrop-blur-[100px] ${
                isStacked ? 'flex-col' : ''
            } ${className}`}
            style={style}
            data-popover-content
        >
            <div className={`flex flex-col min-h-0 ${listClass}`}>
                {hideSearch ? null : (
                    <div className="relative flex items-center flex-shrink-0 h-11 px-3 border-b border-n-strong">
                        <Icon icon="i-lucide-search" className="size-4 text-n-slate-10" />
                        <input
                            ref={searchRef}
                            value={search}
                            type="text"
                            role="combobox"
                            aria-autocomplete="list"
                            aria-expanded="true"
                            aria-controls={listboxId}
                            aria-activedescendant={items.length ? optionId(selectedIndex) : undefined}
                            aria-label={searchPlaceholder}
                            className="w-full h-full px-2 text-sm bg-transparent outline-none text-n-slate-12 placeholder:text-n-slate-10 reset-base"
                            placeholder={searchPlaceholder}
                            onChange={event => onSearchChange(event.target.value)}
                        />
                    </div>
                )}
                {renderFilters ? (
                    // mousedown.prevent của gốc: bấm tab lọc không cướp focus khỏi ô tìm kiếm.
                    <div
                        className="flex-shrink-0 min-w-0 px-1 pt-1 pb-1.5"
                        onMouseDown={event => event.preventDefault()}
                    >
                        {renderFilters()}
                    </div>
                ) : null}
                <div ref={listRef} className="flex-1 p-1 overflow-y-auto">
                    <ul id={listboxId} role="listbox" className="m-0 list-none">
                        {items.map((item, index) => (
                            <Fragment key={item.id}>
                                {groupFor(index) ? (
                                    <li
                                        role="presentation"
                                        className={`px-2 pb-1 text-xs font-medium text-n-slate-10 ${index === 0 ? '' : 'pt-2'}`}
                                    >
                                        {groupFor(index)}
                                    </li>
                                ) : null}
                                <li
                                    id={optionId(index)}
                                    data-index={index}
                                    role="option"
                                    aria-selected={index === selectedIndex}
                                    className={`flex items-center w-full gap-2 px-2 py-1 overflow-hidden rounded-lg cursor-pointer text-start ${
                                        index === selectedIndex ? 'bg-n-alpha-black2' : ''
                                    }`}
                                    onMouseMove={() => onSelectedIndexChange(index)}
                                    onClick={() => onSelect(index)}
                                >
                                    {renderLeading?.(item, index === selectedIndex)}
                                    <span className="flex flex-col min-w-0 gap-0.5">
                                        <span
                                            className="max-w-full min-w-0 text-sm font-medium truncate text-n-slate-12"
                                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.title) }}
                                        />
                                        {item.subtitle ? (
                                            <span
                                                className="max-w-full min-w-0 text-xs truncate text-n-slate-11"
                                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(item.subtitle) }}
                                            />
                                        ) : null}
                                    </span>
                                </li>
                            </Fragment>
                        ))}
                    </ul>
                    {!items.length ? (
                        <div role="status" className="flex items-center px-2 py-1.5 text-sm text-n-slate-11">
                            {isLoading ? <Spinner size={16} /> : (renderEmpty?.() ?? emptyLabel)}
                        </div>
                    ) : null}
                </div>
            </div>
            {hasPreview ? (
                <div className={`flex flex-col min-w-0 ${previewClass}`}>
                    {!isStacked ? (
                        <div className="flex items-center flex-shrink-0 h-11 px-4 border-b border-n-strong">
                            <span className="min-w-0 text-xs font-medium truncate text-n-slate-11">
                                {selectedItem?.label}
                            </span>
                        </div>
                    ) : null}
                    <div className="relative flex-1 min-h-0">
                        <div className="absolute inset-0 overflow-y-auto">{renderPreview?.(selectedItem)}</div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

const PreviewPicker = forwardRef(PreviewPickerInner) as <TItem extends PreviewPickerItem>(
    props: PreviewPickerProps<TItem> & { ref?: React.ForwardedRef<PreviewPickerHandle> },
) => ReturnType<typeof PreviewPickerInner>;

export default PreviewPicker;
