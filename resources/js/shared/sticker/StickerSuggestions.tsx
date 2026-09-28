import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

import StickerImage from './StickerImage';

export interface StickerSuggestionItem {
    id: string;
    image_url: string;
    label: string | null;
}

export interface StickerSuggestionsLabels {
    list: string;
    dismiss: string;
    stickerFallback: string;
}

export interface StickerSuggestionsClassNames {
    root?: string;
    item?: string;
    image?: string;
    dismiss?: string;
}

interface StickerSuggestionsProps<T extends StickerSuggestionItem> {
    stickers: readonly T[];
    labels: StickerSuggestionsLabels;
    dismissIcon: ReactNode;
    classNames?: StickerSuggestionsClassNames;
    onPick: (sticker: T) => void;
    onDismiss: () => void;
}

const DEFAULT_CLASS_NAMES: Required<StickerSuggestionsClassNames> = {
    root: 'flex items-center gap-1',
    item: 'flex flex-none items-center justify-center rounded-md p-1 active:scale-[0.97]',
    image: '',
    dismiss: 'ms-auto flex size-11 flex-none items-center justify-center rounded-md active:scale-[0.97]',
};

// Đóng hàng gợi ý chỉ có hiệu lực với đúng cụm đang gõ; gõ thêm hay xoá bớt là
// một cụm mới nên gợi ý được hiện lại.
export function useDismissibleQuery(query: string | null) {
    const [dismissedQuery, setDismissedQuery] = useState<string | null>(null);
    if (dismissedQuery !== null && query !== dismissedQuery) setDismissedQuery(null);
    const dismiss = useCallback(() => setDismissedQuery(query), [query]);

    return { isDismissed: query !== null && query === dismissedQuery, dismiss };
}

const NEXT_KEYS = new Set(['ArrowRight', 'ArrowDown']);
const PREVIOUS_KEYS = new Set(['ArrowLeft', 'ArrowUp']);

// Hàng sticker gợi ý nằm ngay trên ô nhập, dùng chung cho hộp thư và widget; nguồn
// dữ liệu và việc gửi do từng bề mặt tự lo. Là một toolbar một điểm dừng Tab: vào
// hàng bằng Tab, mũi tên đổi sticker, Enter/Space gửi, Esc đóng. Phím Enter của ô
// nhập không đi qua đây nên gửi tin vẫn như cũ.
export default function StickerSuggestions<T extends StickerSuggestionItem>({
    stickers,
    labels,
    dismissIcon,
    classNames = {},
    onPick,
    onDismiss,
}: StickerSuggestionsProps<T>) {
    const styles = { ...DEFAULT_CLASS_NAMES, ...classNames };
    const [activeIndex, setActiveIndex] = useState(0);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => setActiveIndex(0), [stickers]);

    if (stickers.length === 0) return null;

    const focusItem = (index: number) => {
        const nextIndex = (index + stickers.length) % stickers.length;
        setActiveIndex(nextIndex);
        itemRefs.current[nextIndex]?.focus();
    };

    const handleItemKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (NEXT_KEYS.has(event.key)) focusItem(index + 1);
        else if (PREVIOUS_KEYS.has(event.key)) focusItem(index - 1);
        else if (event.key === 'Home') focusItem(0);
        else if (event.key === 'End') focusItem(stickers.length - 1);
        else if (event.key === 'Enter' || event.key === ' ') onPick(stickers[index]);
        else return;
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div
            role="toolbar"
            aria-label={labels.list}
            aria-orientation="horizontal"
            data-testid="sticker-suggestions"
            className={styles.root}
            onKeyDown={event => {
                if (event.key !== 'Escape') return;
                event.preventDefault();
                event.stopPropagation();
                onDismiss();
            }}
        >
            {stickers.map((sticker, index) => (
                <button
                    key={sticker.id}
                    ref={element => {
                        itemRefs.current[index] = element;
                    }}
                    type="button"
                    tabIndex={index === activeIndex ? 0 : -1}
                    aria-label={sticker.label || labels.stickerFallback}
                    title={sticker.label || undefined}
                    className={styles.item}
                    onClick={() => onPick(sticker)}
                    onKeyDown={event => handleItemKeyDown(event, index)}
                    onFocus={() => setActiveIndex(index)}
                >
                    <StickerImage src={sticker.image_url} className={styles.image} />
                </button>
            ))}
            <button type="button" aria-label={labels.dismiss} title={labels.dismiss} className={styles.dismiss} onClick={onDismiss}>
                {dismissIcon}
            </button>
        </div>
    );
}
