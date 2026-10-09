import path from 'node:path';
import { buildSendMessageContent, captionOf } from './send-content.mjs';

/**
 * Nhiều ảnh của MỘT tin Yona đi thành một khối album trên Zalo, như khi người
 * dùng tự chọn nhiều ảnh trong app. Chữ của tin KHÔNG làm chú thích đè lên ảnh:
 * nó đi thành một tin chữ riêng NGAY SAU các tệp (mang trích dẫn, nhắc tên),
 * đúng thứ tự Yona hiện tệp và chữ thành hai bong bóng.
 *
 * Trên Zalo, album là N tin `chat.photo` (mỗi ảnh một msgId) nối với nhau bằng
 * `groupLayoutId` + `idInGroup` + `totalItemInGroup`; app gom chúng thành một lưới.
 *
 * `api.sendMessage` của zca-js dựng được khối album nhưng gửi chữ TRƯỚC tệp và
 * gửi các ảnh song song. Module này tải ảnh lên bằng `api.uploadAttachment` rồi
 * gửi từng ảnh qua `api.custom()` theo đúng tham số ảnh của `sendMessage.js`
 * (zca-js 2.1.2), lần lượt theo thứ tự trong khối. Tên bắt đầu bằng `_` để
 * buildAllowlist (zca-adapter.mjs) bỏ qua: chỉ đi đường /personal-messages/send.
 */
export const PHOTO_ALBUM_METHOD = '_sendPhotoAlbum';

/** Đuôi `uploadAttachment` xếp vào loại ảnh; đuôi khác thành thẻ tệp, không vào khối được. */
const ALBUM_PHOTO_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

const MIN_ALBUM_PHOTOS = 2;

/** Dùng khi phiên chưa nạp `ctx.settings.features.sharefile.max_file` (trần số tệp mỗi lượt Zalo cấp). */
const FALLBACK_MAX_ALBUM_PHOTOS = 50;

export function isAlbumPhotoPath(filePath) {
    return ALBUM_PHOTO_EXTENSIONS.has(path.extname(String(filePath ?? '')).slice(1).toLowerCase());
}

function chunk(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

/**
 * Tham số một ảnh trong khối, khớp nhánh `case "image"` của `handleAttachment`
 * (zca-js 2.1.2 `apis/sendMessage.js`) khi gửi nhiều tệp.
 */
export function albumPhotoParams({ upload, index, total, groupLayoutId, threadId, isGroup, clientId }) {
    const params = {
        photoId: upload.photoId,
        clientId: String(clientId),
        desc: '',
        width: upload.width,
        height: upload.height,
        rawUrl: upload.normalUrl,
        hdUrl: upload.hdUrl,
        thumbUrl: upload.thumbUrl,
        hdSize: String(upload.totalSize),
        zsource: -1,
        ttl: 0,
        jcp: '{"convertible":"jxl"}',
        groupLayoutId,
        isGroupLayout: 1,
        idInGroup: index,
        totalItemInGroup: total,
        extMsgProp: JSON.stringify({ groupMediaMsg: { groupLayoutId } }),
    };

    return isGroup
        ? { ...params, grid: String(threadId), oriUrl: upload.normalUrl }
        : { ...params, toid: String(threadId), normalUrl: upload.normalUrl };
}

function photoSendEndpoint(fileService, isGroup) {
    return `${fileService}/api/${isGroup ? 'group' : 'message'}/photo_original/send`;
}

function fileServiceOf(api) {
    const fileService = api?.zpwServiceMap?.file?.[0];
    if (typeof fileService !== 'string' || fileService === '') {
        throw new Error('photo_album_file_service_missing');
    }

    return fileService;
}

/**
 * Đăng ký một lần cho mỗi phiên: `custom()` khai thuộc tính không ghi đè được.
 * Callback của `custom()` mới có `ctx` (trần số tệp mỗi lượt của phiên) nên cả
 * việc chia khối lẫn tải lên nằm ở đây. `onSent` nhận từng ảnh ngay khi Zalo
 * nhận, để lỗi giữa chừng vẫn biết ảnh nào đã tới khách.
 */
export function ensurePhotoAlbumApi(api) {
    if (typeof api[PHOTO_ALBUM_METHOD] === 'function') {
        return;
    }
    api.custom(PHOTO_ALBUM_METHOD, async ({ ctx, utils, props }) => {
        const { photos, threadId, threadType, isGroup, fileService, onSent } = props;
        const maxPhotos = Number(ctx?.settings?.features?.sharefile?.max_file) || FALLBACK_MAX_ALBUM_PHOTOS;
        const chunks = chunk(photos, Math.max(MIN_ALBUM_PHOTOS, maxPhotos));
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const uploads = await api.uploadAttachment(chunks[chunkIndex], threadId, threadType);
            const groupLayoutId = String(Date.now());
            let clientId = Date.now();
            for (let index = 0; index < uploads.length; index++) {
                const params = albumPhotoParams({
                    upload: uploads[index],
                    index,
                    total: uploads.length,
                    groupLayoutId,
                    threadId,
                    isGroup,
                    clientId: clientId++,
                });
                const encryptedParams = utils.encodeAES(JSON.stringify(params));
                if (!encryptedParams) {
                    throw new Error('photo_album_encrypt_failed');
                }
                const response = await utils.request(utils.makeURL(photoSendEndpoint(fileService, isGroup), { nretry: 0 }), {
                    method: 'POST',
                    body: new URLSearchParams({ params: encryptedParams }),
                });
                onSent(await utils.resolve(response));
            }
        }
    });
}

/**
 * Lỗi giữa chừng vẫn mang các tin đã tới khách: chiều ra phải ghi được msgId của
 * chúng để echo không thành tin ma và thu hồi vẫn với tới.
 */
export class PartialSendError extends Error {
    constructor(cause, sentResult) {
        super(cause?.message ? String(cause.message) : String(cause));
        this.name = cause?.name ?? 'Error';
        this.cause = cause;
        this.sentResult = sentResult;
    }
}

async function sendAndCollect(api, content, { threadId, threadType, sent }) {
    const result = await api.sendMessage(content, threadId, threadType);
    if (result?.message) {
        sent.attachment.push(result.message);
    }
    sent.attachment.push(...(Array.isArray(result?.attachment) ? result.attachment : []));
}

/**
 * @param {object} api phiên zca-js
 * @param {{ paths: string[], text?: unknown, quote?: unknown, mentions?: unknown, threadId: string, threadType: number, isGroup: boolean }} input
 * @returns {Promise<{ message: object | null, attachment: object[] }>} cùng khuôn kết quả `sendMessage`, thứ tự = thứ tự trên Zalo
 */
export async function sendPhotoAlbum(api, { paths, text, quote, mentions, threadId, threadType, isGroup }) {
    const photos = paths.filter(isAlbumPhotoPath);
    const asAlbum = photos.length >= MIN_ALBUM_PHOTOS;
    const separateFiles = asAlbum ? paths.filter((filePath) => !isAlbumPhotoPath(filePath)) : paths;
    const target = { threadId, threadType, sent: { message: null, attachment: [] } };

    try {
        if (asAlbum) {
            const fileService = fileServiceOf(api);
            ensurePhotoAlbumApi(api);
            await api[PHOTO_ALBUM_METHOD]({
                photos,
                threadId,
                threadType,
                isGroup,
                fileService,
                onSent: (result) => target.sent.attachment.push(result),
            });
        }
        for (const filePath of separateFiles) {
            await sendAndCollect(api, buildSendMessageContent({ attachmentPath: filePath, isGroup }), target);
        }
        const caption = captionOf(text);
        if (caption !== '') {
            await sendAndCollect(api, buildSendMessageContent({ text: caption, quote, mentions, isGroup }), target);
        }

        return target.sent;
    } catch (error) {
        throw new PartialSendError(error, target.sent);
    }
}

export const INVALID_ALBUM = 'invalid album';

const MAX_ALBUM_ITEMS = 100;

/**
 * Body `album` từ Laravel: danh sách ảnh `{file_url, filename?, content_type?}`.
 * Vắng → null (không phải tin album); có mà sai khuôn → ném INVALID_ALBUM.
 *
 * @returns {{ fileUrl: string, filename: string | null, contentType: string | null }[] | null}
 */
export function parseAlbumItems(raw) {
    if (raw === undefined || raw === null) {
        return null;
    }
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_ALBUM_ITEMS) {
        throw new Error(INVALID_ALBUM);
    }

    return raw.map((item) => {
        const fileUrl = typeof item?.file_url === 'string' ? item.file_url.trim() : '';
        if (fileUrl === '') {
            throw new Error(INVALID_ALBUM);
        }

        return {
            fileUrl,
            filename: typeof item.filename === 'string' ? item.filename : null,
            contentType: typeof item.content_type === 'string' ? item.content_type : null,
        };
    });
}
