import { assertUrlAllowed } from './media-fetch.mjs';

/**
 * Sticker tự tạo của Zalo: người nhận thấy một sticker cỡ gọn (như sticker gốc)
 * thay vì một ảnh phóng to. Zalo tự tải ảnh từ URL công khai của mình, bridge
 * không tải tệp nhưng vẫn chỉ nhận URL thuộc allowlist để không đẩy URL lạ ra.
 *
 * Gọi qua `api.custom()` của zca-js. Tên bắt đầu bằng `_` để buildAllowlist
 * (zca-adapter.mjs) bỏ qua: method này tạo tin nên chỉ đi đường /personal-messages/send.
 */
export const CUSTOM_STICKER_METHOD = '_sendCustomSticker';

export const INVALID_CUSTOM_STICKER = 'invalid custom_sticker';

const MAX_EDGE = 1024;

const STICKER_PROPERTIES = JSON.stringify({
    subType: 0,
    color: -1,
    size: -1,
    type: 3,
    ext: JSON.stringify({ sSrcStr: '@STICKER', sSrcType: 0 }),
});

function edge(value) {
    const number = Number(value);

    return Number.isInteger(number) && number > 0 && number <= MAX_EDGE ? number : null;
}

function trimmedString(value) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Body `custom_sticker` từ Laravel → sticker hợp lệ, hoặc null khi body không
 * mang khoá này. Mang mà sai dạng thì ném, không lặng lẽ rơi sang đường khác.
 * Ảnh động thiếu thì dùng ảnh tĩnh.
 */
export function parseCustomSticker(raw, allowedHosts) {
    if (raw === undefined || raw === null) {
        return null;
    }
    const staticUrl = trimmedString(raw?.static_url);
    const width = edge(raw?.width);
    const height = edge(raw?.height);
    if (staticUrl === null || width === null || height === null) {
        throw new Error(INVALID_CUSTOM_STICKER);
    }
    const animationUrl = trimmedString(raw?.animation_url) ?? staticUrl;
    assertUrlAllowed(staticUrl, allowedHosts);
    assertUrlAllowed(animationUrl, allowedHosts);

    return { staticUrl, animationUrl, width, height };
}

export function customStickerParams({ sticker, threadId, isGroup, clientId }) {
    const target = isGroup ? { grid: String(threadId), visibility: 0 } : { toId: String(threadId) };

    return {
        clientId,
        title: '',
        oriUrl: sticker.staticUrl,
        thumbUrl: sticker.staticUrl,
        hdUrl: sticker.staticUrl,
        width: sticker.width,
        height: sticker.height,
        thumb_width: sticker.width,
        thumb_height: sticker.height,
        properties: STICKER_PROPERTIES,
        contentId: clientId,
        webp: JSON.stringify({ width: sticker.width, height: sticker.height, url: sticker.animationUrl }),
        zsource: -1,
        ttl: 0,
        ...target,
    };
}

function customStickerEndpoint(ctx, isGroup) {
    return `${ctx.zpwServiceMap.file[0]}/api/${isGroup ? 'group' : 'message'}/photo_url`;
}

/** Đăng ký một lần cho mỗi phiên: `custom()` khai thuộc tính không ghi đè được. */
export function ensureCustomStickerApi(api) {
    if (typeof api[CUSTOM_STICKER_METHOD] === 'function') {
        return;
    }
    api.custom(CUSTOM_STICKER_METHOD, async ({ ctx, utils, props }) => {
        const params = customStickerParams({ ...props, clientId: Date.now() });
        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams) {
            throw new Error('custom_sticker_encrypt_failed');
        }
        const response = await utils.request(utils.makeURL(customStickerEndpoint(ctx, props.isGroup), { nretry: 0 }), {
            method: 'POST',
            body: new URLSearchParams({ params: encryptedParams }),
        });

        return utils.resolve(response);
    });
}

export async function sendCustomSticker(api, { sticker, threadId, isGroup }) {
    ensureCustomStickerApi(api);

    return api[CUSTOM_STICKER_METHOD]({ sticker, threadId, isGroup });
}
