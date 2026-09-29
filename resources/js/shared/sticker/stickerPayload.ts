// Sticker kho Yona trong `content_attributes.sticker` mang `source: 'yona'`: tin mới có
// `image_url` (WebP, có thể động) và `url` (PNG tĩnh); tin cũ máy chủ trả `image_url`
// là ảnh tĩnh cũ, hoặc chỉ còn `url`. Sticker nền tảng (Zalo…) không có `source`.

const nonEmptyString = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

function yonaPayload(sticker: unknown): Record<string, unknown> | null {
    if (!sticker || typeof sticker !== 'object') return null;

    const payload = sticker as Record<string, unknown>;

    return payload.source === 'yona' ? payload : null;
}

export function yonaStickerImageUrl(sticker: unknown): string | null {
    const payload = yonaPayload(sticker);
    if (!payload) return null;

    return nonEmptyString(payload.image_url) ?? nonEmptyString(payload.url);
}

// PNG tĩnh để hiện khi sticker động không được chạy; sticker một khung hoặc tin cũ
// (chỉ có ảnh tĩnh) thì null.
export function yonaStickerStaticUrl(sticker: unknown): string | null {
    const payload = yonaPayload(sticker);
    if (!payload || !nonEmptyString(payload.image_url) || payload.frames === 1) return null;

    return nonEmptyString(payload.url);
}
