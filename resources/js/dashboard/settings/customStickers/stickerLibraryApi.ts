import { ApiError, deleteJson, getBlob, getJson, patchJson, postForm, postJson, putJson } from 'dashboard/helper/apiClient';
import type { LibrarySticker, LibraryStickerChanges, LibraryStickerPackDetail, StickerLibraryListing, UploadedSticker } from './types';
import type { StickerEdit } from './stickerEdit';

export interface StickerUpload {
    edit: StickerEdit;
    label: string | null;
    keywords: string[];
}

export interface UploadOptions {
    signal?: AbortSignal;
    // Gọi khi máy chủ bắt chờ vì giới hạn tốc độ, kèm số mili giây sẽ chờ trước lần gửi lại.
    onThrottleWait?: (delayMs: number) => void;
}

const TOO_MANY_REQUESTS = 429;
const MAX_THROTTLE_RETRIES = 3;

function throttleDelayMs(error: unknown): number | null {
    if (!(error instanceof ApiError) || error.status !== TOO_MANY_REQUESTS) return null;
    const retryAfterSeconds = Number((error.body as { retry_after?: unknown } | null)?.retry_after);

    return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : null;
}

// Máy chủ giới hạn số lượt tải mỗi phút: tải nhiều tệp một lúc thì chờ đủ
// retry_after rồi gửi lại, thay vì báo lỗi cả loạt tệp phía sau.
function waitUnlessAborted(delayMs: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(signal.reason);
            return;
        }
        const timer = setTimeout(resolve, delayMs);
        signal?.addEventListener(
            'abort',
            () => {
                clearTimeout(timer);
                reject(signal.reason);
            },
            { once: true },
        );
    });
}

async function withThrottleRetry<T>(send: () => Promise<T>, { signal, onThrottleWait }: UploadOptions = {}): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await send();
        } catch (error) {
            const delayMs = throttleDelayMs(error);
            if (delayMs === null || attempt >= MAX_THROTTLE_RETRIES || signal?.aborted) throw error;
            onThrottleWait?.(delayMs);
            await waitUnlessAborted(delayMs, signal);
        }
    }
}

export type StickerLibraryKind = 'account' | 'platform';

export const accountStickerLibraryBase = (accountId: number) => `/api/v1/accounts/${accountId}`;

const stickerPacksUrl = (baseUrl: string) => `${baseUrl}/sticker_packs`;
const stickerPackUrl = (baseUrl: string, packId: number) => `${stickerPacksUrl(baseUrl)}/${packId}`;

// Cùng một bộ endpoint cho kho chung (Super Admin) và kho riêng của account;
// chỉ khác gốc URL.
export function createStickerLibraryApi(baseUrl: string) {
    const packsUrl = stickerPacksUrl(baseUrl);
    const packUrl = (packId: number) => stickerPackUrl(baseUrl, packId);
    const stickerUrl = (packId: number, stickerId: number) => `${packUrl(packId)}/stickers/${stickerId}`;

    return {
        listPacks: () => getJson<StickerLibraryListing>(packsUrl),
        createPack: (name: string) => postJson<LibraryStickerPackDetail>(packsUrl, { name }),
        getPack: (packId: number) => getJson<LibraryStickerPackDetail>(packUrl(packId)),
        renamePack: (packId: number, name: string) => patchJson<LibraryStickerPackDetail>(packUrl(packId), { name }),
        setPublished: (packId: number, published: boolean) =>
            postJson<LibraryStickerPackDetail>(`${packUrl(packId)}/${published ? 'publish' : 'unpublish'}`, {}),
        deletePack: (packId: number) => deleteJson(packUrl(packId)),
        // Gửi ảnh gốc kèm tham số chỉnh; máy chủ dựng sticker bằng đúng `edit` đó.
        uploadSticker: (packId: number, file: File, { edit, label, keywords }: StickerUpload, options: UploadOptions = {}) => {
            const form = new FormData();
            form.append('file', file);
            form.append('edit', JSON.stringify(edit));
            if (label) form.append('label', label);
            keywords.forEach(keyword => form.append('keywords[]', keyword));

            return withThrottleRetry(() => postForm<UploadedSticker>(`${packUrl(packId)}/stickers`, form, { signal: options.signal }), options);
        },
        reorderStickers: (packId: number, stickerIds: number[]) =>
            putJson<LibraryStickerPackDetail>(`${packUrl(packId)}/stickers/order`, { sticker_ids: stickerIds }),
        updateSticker: (packId: number, stickerId: number, changes: LibraryStickerChanges) =>
            patchJson<LibrarySticker>(stickerUrl(packId, stickerId), { ...changes }),
        // Máy chủ dựng lại sticker từ ảnh gốc đã lưu bằng `edit` mới; id, vị trí giữ nguyên.
        reeditSticker: (packId: number, stickerId: number, { edit, label, keywords }: StickerUpload, options: UploadOptions = {}) =>
            withThrottleRetry(() => patchJson<LibrarySticker>(stickerUrl(packId, stickerId), { edit: JSON.stringify(edit), label, keywords }), options),
        getStickerOriginal: async (packId: number, stickerId: number, filename: string) => {
            const blob = await getBlob(`${stickerUrl(packId, stickerId)}/original`);

            return new File([blob], filename, { type: blob.type });
        },
        deleteSticker: (packId: number, stickerId: number) => deleteJson(stickerUrl(packId, stickerId)),
    };
}

export type StickerLibraryApi = ReturnType<typeof createStickerLibraryApi>;

// Chuyển bộ giữa kho nền tảng và kho riêng luôn đi qua gốc của account đang mở,
// dù màn đang ở tab nào.
export function createStickerPackMoveApi(accountId: number) {
    const baseUrl = accountStickerLibraryBase(accountId);

    return {
        movePack: (packId: number, destination: StickerLibraryKind) =>
            postJson<LibraryStickerPackDetail>(`${stickerPackUrl(baseUrl, packId)}/move`, { library: destination }),
    };
}
