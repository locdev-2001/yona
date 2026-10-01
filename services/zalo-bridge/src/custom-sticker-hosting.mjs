import path from 'node:path';
import sharp from 'sharp';
import { cleanupTempDownload, downloadUrlToTemp } from './media-fetch.mjs';
import { uploadedUrl } from './media-tools.mjs';

/**
 * Đưa ảnh sticker tự tạo lên CDN của Zalo trước khi gửi.
 *
 * Zalo Web (chat.zalo.me) vẽ tin sticker AI bằng `fetch()` URL ảnh rồi gắn blob vào thẻ img,
 * mà CSP `connect-src` của trang chỉ cho các miền của Zalo (*.zdn.vn, *.zadn.vn, *.dlfl.vn...).
 * URL ảnh trên miền của Yona bị chặn nên Web để trống; Zalo desktop tải thẳng URL nên vẫn hiện.
 * Ảnh nằm trên CDN Zalo thì cả hai cùng vẽ được.
 *
 * Ảnh lên đường ảnh của Zalo (`uploadAttachment`, chỉ tải lên, chưa gửi tin) dưới dạng JPEG
 * phẳng nền trắng, giống tệp sticker AI thật của Zalo (WebP không kênh trong suốt, nền trắng):
 * tự chọn nền thay vì để Zalo đổi định dạng và làm vùng trong suốt thành màu bất kỳ.
 */
const STICKER_BACKGROUND = '#ffffff';
const JPEG_QUALITY = 92;
const MAX_STICKER_SOURCE_BYTES = 5 * 1024 * 1024;
const MAX_CACHED_STICKERS = 500;
const USER_THREAD = 0;
const GROUP_THREAD = 1;

export async function flattenStickerToJpeg(sourcePath) {
    const jpegPath = path.join(path.dirname(sourcePath), 'sticker.jpg');
    await sharp(sourcePath, { animated: false }).flatten({ background: STICKER_BACKGROUND }).jpeg({ quality: JPEG_QUALITY }).toFile(jpegPath);

    return jpegPath;
}

/**
 * Trả hàm `(api, sticker, { threadId, isGroup }) → sticker trỏ CDN Zalo`. URL ảnh sticker của
 * Yona mang cạnh và băm nội dung nên không đổi nội dung: mỗi phiên Zalo nhớ URL đã tải lên.
 */
export function createZaloStickerHost({
    allowedHosts,
    download = downloadUrlToTemp,
    cleanup = cleanupTempDownload,
    toJpeg = flattenStickerToJpeg,
    maxCached = MAX_CACHED_STICKERS,
} = {}) {
    const hostedUrlsBySession = new WeakMap();

    function sessionCache(api) {
        let cache = hostedUrlsBySession.get(api);
        if (!cache) {
            cache = new Map();
            hostedUrlsBySession.set(api, cache);
        }

        return cache;
    }

    function remember(cache, sourceUrl, hostedUrl) {
        if (cache.size >= maxCached) {
            cache.delete(cache.keys().next().value);
        }
        cache.set(sourceUrl, hostedUrl);
    }

    return async function hostStickerOnZalo(api, sticker, { threadId, isGroup }) {
        const cache = sessionCache(api);
        let hostedUrl = cache.get(sticker.staticUrl);
        if (!hostedUrl) {
            let sourcePath = null;
            try {
                sourcePath = await download(sticker.staticUrl, { allowedHosts, maxBytes: MAX_STICKER_SOURCE_BYTES, mediaKind: 'image' });
                const jpegPath = await toJpeg(sourcePath);
                const uploadResult = await api.uploadAttachment(jpegPath, String(threadId), isGroup ? GROUP_THREAD : USER_THREAD);
                hostedUrl = uploadedUrl(uploadResult, (entry) => entry.hdUrl || entry.normalUrl);
            } finally {
                await cleanup(sourcePath);
            }
            remember(cache, sticker.staticUrl, hostedUrl);
        }

        return { ...sticker, zaloHostedUrl: hostedUrl };
    };
}
