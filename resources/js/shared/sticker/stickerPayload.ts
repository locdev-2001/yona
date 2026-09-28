// Sticker kho Yona trong `content_attributes.sticker` mang `source: 'yona'`: tin mới có
// `image_url` (WebP, có thể động) và `url` (PNG tĩnh); tin cũ máy chủ trả `image_url`
// là ảnh tĩnh cũ, hoặc chỉ còn `url`. Sticker nền tảng (Zalo…) không có `source`.

const nonEmptyString = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

export function yonaStickerImageUrl(sticker: unknown): string | null {
    if (!sticker || typeof sticker !== 'object') return null;

    const payload = sticker as Record<string, unknown>;
    if (payload.source !== 'yona') return null;

    return nonEmptyString(payload.image_url) ?? nonEmptyString(payload.url);
}
