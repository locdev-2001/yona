// Sticker kho Yona: máy chủ trả `source: 'yona'` kèm poster và bản động (Lottie).
// Sticker nền tảng (Zalo…) không có `source` và vẫn hiện bằng ảnh như cũ.

export interface AnimatedStickerSource {
    posterUrl: string;
    animationUrl: string | null;
}

const nonEmptyString = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

export function animatedStickerSource(sticker: unknown): AnimatedStickerSource | null {
    if (!sticker || typeof sticker !== 'object') return null;

    const payload = sticker as Record<string, unknown>;
    if (payload.source !== 'yona') return null;

    const posterUrl = nonEmptyString(payload.poster_url) ?? nonEmptyString(payload.url);
    if (!posterUrl) return null;

    return { posterUrl, animationUrl: nonEmptyString(payload.animation_url) };
}
