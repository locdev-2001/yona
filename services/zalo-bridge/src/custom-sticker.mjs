import { assertUrlAllowed } from './media-fetch.mjs';
import { loggableError } from './media-tools.mjs';

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

/**
 * Cách Zalo vẽ tin sticker tự tạo, chọn bằng ZALO_CUSTOM_STICKER_LAYOUT của bridge.
 * Client Zalo (web/desktop) xếp tin chat.photo khung không viền (properties.type 3) vào ba bộ vẽ:
 * - `ai`: params mang pStickerType 1 → bộ vẽ sticker AI. Desktop và Web vẽ từ oriUrl, nên oriUrl
 *   trỏ bản đã đưa lên CDN Zalo (custom-sticker-hosting.mjs): Zalo Web tải ảnh sticker AI bằng
 *   fetch() bị CSP chặn mọi miền ngoài Zalo. App điện thoại vẽ từ webp.url bằng bộ giải mã WebP,
 *   nên webp.url giữ tệp WebP gốc của Yona (bản CDN Zalo là JPEG). Đưa lên hỏng thì gửi như `ai_direct`.
 * - `ai_direct`: như `ai` nhưng trỏ thẳng URL của Yona: desktop hiện đúng, Web để trống.
 * - `photo`: có contentId + webp mà không có pStickerType → bộ vẽ "photo sticker" cũ, desktop
 *   tải tệp về bộ nhớ đệm theo contentId; tệp ngoài CDN Zalo rơi vào ô mặt cười xám.
 * - `plain`: không contentId/webp → bộ vẽ ảnh không viền: desktop tải thẳng oriUrl, Web tải qua
 *   fetch nên cũng vướng CSP như `ai_direct`.
 */
export const CUSTOM_STICKER_LAYOUTS = Object.freeze(['ai', 'ai_direct', 'photo', 'plain']);

export const DEFAULT_CUSTOM_STICKER_LAYOUT = 'ai';

const BORDERLESS_BUBBLE_LAYOUT = 3;

const AI_STICKER_TYPE = 1;

const PLAIN_EXT = JSON.stringify({ shouldParseLinkOrContact: 0 });

const PHOTO_STICKER_EXT = JSON.stringify({ sSrcStr: '@STICKER', sSrcType: 0 });

const ZALO_HOSTED_LAYOUT = 'ai';

export const CUSTOM_STICKER_LOG_TAG = '[zalo-bridge:custom-sticker]';

export function customStickerLayout(value) {
    const layout = typeof value === 'string' ? value.trim().toLowerCase() : '';

    return CUSTOM_STICKER_LAYOUTS.includes(layout) ? layout : DEFAULT_CUSTOM_STICKER_LAYOUT;
}

function stickerProperties(ext) {
    return JSON.stringify({ subType: 0, color: -1, size: -1, type: BORDERLESS_BUBBLE_LAYOUT, ext });
}

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

function layoutParams(layout, sticker, clientId) {
    const { staticUrl, animationUrl, width, height } = sticker;
    const animation = JSON.stringify({ width, height, url: animationUrl });

    if (layout === 'photo') {
        return {
            oriUrl: staticUrl,
            thumbUrl: staticUrl,
            hdUrl: staticUrl,
            properties: stickerProperties(PHOTO_STICKER_EXT),
            contentId: clientId,
            thumb_width: width,
            thumb_height: height,
            webp: animation,
        };
    }
    if (layout === 'plain') {
        return {
            oriUrl: animationUrl,
            thumbUrl: animationUrl,
            hdUrl: animationUrl,
            properties: stickerProperties(PLAIN_EXT),
        };
    }

    // Server Zalo bỏ pStickerType đặt thẳng trong params; client Zalo gửi nó trong `jcp`.
    const imageUrl = sticker.zaloHostedUrl ?? animationUrl;

    return {
        oriUrl: imageUrl,
        thumbUrl: imageUrl,
        hdUrl: imageUrl,
        properties: stickerProperties(PLAIN_EXT),
        contentId: clientId,
        thumb_width: width,
        thumb_height: height,
        webp: animation,
        jcp: JSON.stringify({ pStickerType: AI_STICKER_TYPE }),
    };
}

export function customStickerParams({ sticker, threadId, isGroup, clientId, layout = DEFAULT_CUSTOM_STICKER_LAYOUT }) {
    const target = isGroup ? { grid: String(threadId), visibility: 0 } : { toId: String(threadId) };

    return {
        clientId,
        title: '',
        width: sticker.width,
        height: sticker.height,
        ...layoutParams(customStickerLayout(layout), sticker, clientId),
        zsource: -1,
        ttl: 0,
        ...target,
    };
}

// zca-js giữ bản đồ dịch vụ trên `api`, không đưa vào `ctx` của callback custom: đọc ở chỗ gọi.
function customStickerEndpoint(fileService, isGroup) {
    return `${fileService}/api/${isGroup ? 'group' : 'message'}/photo_url`;
}

function fileServiceOf(api) {
    const fileService = api?.zpwServiceMap?.file?.[0];
    if (typeof fileService !== 'string' || fileService === '') {
        throw new Error('custom_sticker_file_service_missing');
    }

    return fileService;
}

/** Đăng ký một lần cho mỗi phiên: `custom()` khai thuộc tính không ghi đè được. */
export function ensureCustomStickerApi(api) {
    if (typeof api[CUSTOM_STICKER_METHOD] === 'function') {
        return;
    }
    api.custom(CUSTOM_STICKER_METHOD, async ({ utils, props }) => {
        const params = customStickerParams({ ...props, clientId: Date.now() });
        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams) {
            throw new Error('custom_sticker_encrypt_failed');
        }
        const response = await utils.request(utils.makeURL(customStickerEndpoint(props.fileService, props.isGroup), { nretry: 0 }), {
            method: 'POST',
            body: new URLSearchParams({ params: encryptedParams }),
        });

        return utils.resolve(response);
    });
}

async function stickerForLayout(api, { sticker, threadId, isGroup, layout, hostSticker, warn }) {
    if (customStickerLayout(layout) !== ZALO_HOSTED_LAYOUT || typeof hostSticker !== 'function') {
        return sticker;
    }
    try {
        return await hostSticker(api, sticker, { threadId, isGroup });
    } catch (error) {
        warn(CUSTOM_STICKER_LOG_TAG, 'host_on_zalo_failed', loggableError(error));

        return sticker;
    }
}

/**
 * `hostSticker` (custom-sticker-hosting.mjs) đưa ảnh lên CDN Zalo cho dạng `ai`; vắng hoặc hỏng
 * thì gửi URL của Yona, tin vẫn tới khách.
 */
export async function sendCustomSticker(api, { sticker, threadId, isGroup, layout, hostSticker = null, warn = console.warn }) {
    const fileService = fileServiceOf(api);
    ensureCustomStickerApi(api);
    const sentSticker = await stickerForLayout(api, { sticker, threadId, isGroup, layout, hostSticker, warn });

    return api[CUSTOM_STICKER_METHOD]({ sticker: sentSticker, threadId, isGroup, layout, fileService });
}
