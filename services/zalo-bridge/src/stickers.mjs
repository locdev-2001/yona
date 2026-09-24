import { stickerIdFrom, stickerUrlFromId } from './inbound-content.mjs';

/**
 * Danh mục sticker cho lõi: tìm theo từ khoá, tra chi tiết theo mã, lấy cả bộ.
 * Mọi phần chuẩn hoá nằm ở đây (thuần, test được) để route chỉ còn việc kiểm
 * tham số, gọi zca và trả kết quả.
 *
 * Hình dạng một mục trả cho lõi: `{ id, cate_id, type, url, label }` — đủ bộ ba
 * `id/cateId/type` mà `sendSticker` cần, cộng địa chỉ ảnh do bridge dựng.
 */

export const SEARCH_LIMIT_DEFAULT = 30;
export const SEARCH_LIMIT_MAX = 50;
export const KEYWORD_MAX_LENGTH = 50;
export const SUGGESTION_FALLBACK_MAX = 12;
export const DETAIL_IDS_MAX = 20;

// `.d.ts` của zca ghi các hàm sticker trả mảng, nhưng chúng trả nguyên `data` của
// Zalo qua `utils.resolve` — chưa kiểm trên phiên thật nên nhận cả dạng bọc ngoài.
const WRAPPER_KEYS = ['items', 'stickers', 'sticker_list', 'list', 'data'];
const WRAPPER_DEPTH = 2;

// Nhãn dạng `[^61900.98930^]` là mã nội bộ của Zalo, không phải chữ cho người đọc.
const LABEL_CODE_PATTERN = /^\[\^.*\^\]$/;

function positiveInt(value) {
    const number = Number(value);

    return Number.isInteger(number) && number > 0 ? number : null;
}

function nonNegativeInt(value) {
    const number = Number(value);

    return Number.isInteger(number) && number >= 0 ? number : null;
}

function readableLabel(text) {
    const label = typeof text === 'string' ? text.trim() : '';

    return label === '' || LABEL_CODE_PATTERN.test(label) ? null : label;
}

function looksLikeSticker(entry) {
    return entry !== null && typeof entry === 'object' && (entry.sticker_id != null || entry.id != null);
}

export function asArray(result, depth = WRAPPER_DEPTH) {
    if (Array.isArray(result)) {
        return result;
    }
    if (!result || typeof result !== 'object' || depth <= 0) {
        return [];
    }
    for (const key of WRAPPER_KEYS) {
        const nested = asArray(result[key], depth - 1);
        if (nested.length) {
            return nested;
        }
    }
    const firstStickerList = Object.values(result).find(
        (value) => Array.isArray(value) && value.some(looksLikeSticker)
    );

    return firstStickerList ?? [];
}

function catalogItem({ id, cateId, type, url, label }) {
    const stickerId = positiveInt(id);
    if (stickerId === null) {
        return null;
    }
    const imageUrl = typeof url === 'string' && url.trim() !== '' ? url.trim() : stickerUrlFromId(stickerId);

    return {
        id: stickerId,
        cate_id: nonNegativeInt(cateId) ?? 0,
        type: positiveInt(type) ?? 1,
        url: imageUrl,
        label: readableLabel(label),
    };
}

function uniqueItems(entries, toItem) {
    const seen = new Set();
    const items = [];
    for (const entry of entries) {
        const item = entry && typeof entry === 'object' ? toItem(entry) : null;
        if (item && !seen.has(item.id)) {
            seen.add(item.id);
            items.push(item);
        }
    }

    return items;
}

/** Kết quả `searchSticker` (`{type, cate_id, sticker_id}`) — không có ảnh, bridge dựng từ mã. */
export function catalogItemsFromBasic(result) {
    return uniqueItems(asArray(result), (raw) =>
        catalogItem({
            id: raw.sticker_id ?? raw.id,
            cateId: raw.cate_id ?? raw.cateId,
            type: raw.type,
            url: null,
            label: null,
        })
    );
}

/** Kết quả `getStickersDetail` / `getStickerCategoryDetail` (`StickerDetail`). */
export function catalogItemsFromDetails(result) {
    return uniqueItems(asArray(result), (raw) =>
        catalogItem({
            id: raw.id ?? raw.sticker_id,
            cateId: raw.cateId ?? raw.cate_id ?? raw.catId,
            type: raw.type,
            url: raw.stickerUrl || raw.stickerWebpUrl,
            label: raw.text,
        })
    );
}

/**
 * Bộ ba cho `api.sendSticker`. Sticker nhận về ghi bộ là `catId`, danh mục ghi
 * `cate_id`, bản lõi lưu `cateId` — đọc đủ cả ba, thiếu thì 0 như zca cho phép.
 */
export function stickerSendPayload(raw) {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const id = positiveInt(stickerIdFrom(raw));
    if (id === null) {
        return null;
    }

    return {
        id,
        cateId: nonNegativeInt(raw.cateId ?? raw.cate_id ?? raw.catId) ?? 0,
        type: positiveInt(raw.type) ?? 1,
    };
}

export function parseSearchInput(body) {
    const keyword = typeof body?.keyword === 'string' ? body.keyword.trim() : '';
    const length = [...keyword].length;
    if (length === 0 || length > KEYWORD_MAX_LENGTH) {
        return { error: `keyword must be 1-${KEYWORD_MAX_LENGTH} characters` };
    }
    const requested = positiveInt(body?.limit) ?? SEARCH_LIMIT_DEFAULT;

    return { keyword, limit: Math.min(requested, SEARCH_LIMIT_MAX) };
}

export function parseDetailInput(body) {
    const raw = body?.ids;
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > DETAIL_IDS_MAX) {
        return { error: `ids must be 1-${DETAIL_IDS_MAX} sticker ids` };
    }
    const ids = raw.map(positiveInt);
    if (ids.includes(null)) {
        return { error: 'ids must be positive integers' };
    }

    return { ids: [...new Set(ids)] };
}

export function parseCategoryInput(body) {
    const cateId = positiveInt(body?.cate_id);

    return cateId === null ? { error: 'cate_id must be a positive integer' } : { cateId };
}

/**
 * Tìm bằng `searchSticker` (một request, đủ bộ ba để gửi). Rỗng hoặc lỗi thì
 * rơi về `getStickers` (gợi ý theo từ khoá, chỉ có mã) + `getStickersDetail` —
 * hàm sau gọi MỖI mã một request nên chặn ở vài mã đầu.
 */
export async function searchCatalog(api, { keyword, limit }) {
    try {
        const found = catalogItemsFromBasic(await api.searchSticker(keyword, limit));
        if (found.length) {
            return found.slice(0, limit);
        }
    } catch (error) {
        console.warn('stickers/search: searchSticker failed, falling back to suggestions', error?.message || error);
    }

    const suggested = asArray(await api.getStickers(keyword))
        .map(positiveInt)
        .filter((id) => id !== null)
        .slice(0, SUGGESTION_FALLBACK_MAX);
    if (!suggested.length) {
        return [];
    }

    return catalogItemsFromDetails(await api.getStickersDetail(suggested)).slice(0, limit);
}

export async function detailCatalog(api, { ids }) {
    return catalogItemsFromDetails(await api.getStickersDetail(ids));
}

export async function categoryCatalog(api, { cateId }) {
    return catalogItemsFromDetails(await api.getStickerCategoryDetail(cateId));
}
