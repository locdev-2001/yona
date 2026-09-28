import { useEffect, useState } from 'react';

import { useDismissibleQuery } from 'shared/sticker/StickerSuggestions';
import type { StickerItem } from '../stickerApi';

export const STICKER_SUGGESTION_DEBOUNCE_MS = 250;

const NO_STICKERS: StickerItem[] = [];

export type StickerSuggestionLoader = (query: string, signal: AbortSignal) => Promise<StickerItem[]>;

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

interface LoadedSuggestions {
    query: string;
    loadSuggestions: StickerSuggestionLoader;
    stickers: StickerItem[];
}

// Gợi ý sticker từ máy chủ theo cụm đang gõ: chờ người gõ ngừng một nhịp rồi mới
// hỏi, cụm đổi thì huỷ lượt hỏi cũ để kết quả trễ không đè kết quả mới. Kết quả
// gắn với cụm gõ và loader (tức hội thoại) đã hỏi: một trong hai đổi thì kết quả
// cũ biến mất ngay, không bấm gửi nhầm được. Lỗi mạng chỉ làm hàng gợi ý biến mất,
// không chặn việc soạn tin.
export function useStickerSuggestions(query: string | null, loadSuggestions: StickerSuggestionLoader) {
    const [loaded, setLoaded] = useState<LoadedSuggestions | null>(null);
    const { isDismissed, dismiss } = useDismissibleQuery(query);
    const activeQuery = query !== null && !isDismissed ? query : null;

    useEffect(() => {
        if (activeQuery === null) return undefined;

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            loadSuggestions(activeQuery, controller.signal)
                .then(found => {
                    if (!controller.signal.aborted) setLoaded({ query: activeQuery, loadSuggestions, stickers: found });
                })
                .catch((error: unknown) => {
                    if (!isAbort(error) && !controller.signal.aborted) setLoaded(null);
                });
        }, STICKER_SUGGESTION_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [activeQuery, loadSuggestions]);

    const isCurrent = loaded !== null && loaded.query === activeQuery && loaded.loadSuggestions === loadSuggestions;

    return { stickers: isCurrent ? loaded.stickers : NO_STICKERS, dismiss };
}
