import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { StickerItem } from '../stickerApi';
import { STICKER_SUGGESTION_DEBOUNCE_MS, type StickerSuggestionLoader, useStickerSuggestions } from './useStickerSuggestions';

const sticker = (id: string): StickerItem => ({ id, image_url: `https://cdn.test/${id}.png`, pack_id: null, label: id });

const loaderReturning = (found: StickerItem[]): StickerSuggestionLoader => vi.fn(() => Promise.resolve(found));

async function flushDebounce() {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(STICKER_SUGGESTION_DEBOUNCE_MS);
    });
}

describe('useStickerSuggestions', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('cụm gõ đổi thì bỏ ngay gợi ý của cụm cũ trong lúc chờ kết quả mới', async () => {
        const load = loaderReturning([sticker('ca')]);
        const { result, rerender } = renderHook(({ query }) => useStickerSuggestions(query, load), {
            initialProps: { query: 'ca' as string | null },
        });
        await flushDebounce();
        expect(result.current.stickers.map(item => item.id)).toEqual(['ca']);

        rerender({ query: 'cam' });

        expect(result.current.stickers).toEqual([]);
    });

    it('đổi hội thoại (loader khác) thì bỏ ngay gợi ý của hội thoại cũ', async () => {
        const firstConversation = loaderReturning([sticker('cu')]);
        const secondConversation = loaderReturning([sticker('moi')]);
        const { result, rerender } = renderHook(({ load }) => useStickerSuggestions('haha', load), {
            initialProps: { load: firstConversation },
        });
        await flushDebounce();
        expect(result.current.stickers.map(item => item.id)).toEqual(['cu']);

        rerender({ load: secondConversation });
        expect(result.current.stickers).toEqual([]);

        await flushDebounce();
        expect(result.current.stickers.map(item => item.id)).toEqual(['moi']);
    });
});
