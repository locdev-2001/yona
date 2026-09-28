import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

// Cạnh hiển thị (px CSS) của sticker ở mọi bề mặt. Máy chủ cấu hình một chỗ và đưa
// ra qua Inertia (dashboard) hoặc cấu hình widget; bề mặt nào không cung cấp thì
// dùng mặc định trùng cạnh tệp sticker.
export const DEFAULT_STICKER_DISPLAY_SIZE = 64;
const MIN_STICKER_DISPLAY_SIZE = 16;
const MAX_STICKER_DISPLAY_SIZE = 512;

export function resolveStickerDisplaySize(value: unknown): number {
    return typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= MIN_STICKER_DISPLAY_SIZE &&
        value <= MAX_STICKER_DISPLAY_SIZE
        ? value
        : DEFAULT_STICKER_DISPLAY_SIZE;
}

const StickerDisplaySizeContext = createContext(DEFAULT_STICKER_DISPLAY_SIZE);

export function StickerDisplaySizeProvider({ size, children }: { size: unknown; children: ReactNode }) {
    return (
        <StickerDisplaySizeContext.Provider value={resolveStickerDisplaySize(size)}>{children}</StickerDisplaySizeContext.Provider>
    );
}

export function useStickerDisplaySize(): number {
    return useContext(StickerDisplaySizeContext);
}
