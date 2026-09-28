import { ApiError, deleteJson, getJson, patchJson, postForm, postJson, putJson } from 'dashboard/helper/apiClient';
import type { LibrarySticker, LibraryStickerChanges, LibraryStickerPackDetail, StickerLibraryListing } from './types';

const TOO_MANY_REQUESTS = 429;
const MAX_THROTTLE_RETRIES = 3;

function throttleDelayMs(error: unknown): number | null {
    if (!(error instanceof ApiError) || error.status !== TOO_MANY_REQUESTS) return null;
    const retryAfterSeconds = Number((error.body as { retry_after?: unknown } | null)?.retry_after);

    return Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : null;
}

// Máy chủ giới hạn số lượt tải mỗi phút: tải nhiều tệp một lúc thì chờ đủ
// retry_after rồi gửi lại, thay vì báo lỗi cả loạt tệp phía sau.
async function withThrottleRetry<T>(send: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await send();
        } catch (error) {
            const delayMs = throttleDelayMs(error);
            if (delayMs === null || attempt >= MAX_THROTTLE_RETRIES) throw error;
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
}

// Cùng một bộ endpoint cho kho chung (Super Admin) và kho riêng của account;
// chỉ khác gốc URL.
export function createStickerLibraryApi(baseUrl: string) {
    const packsUrl = `${baseUrl}/sticker_packs`;
    const packUrl = (packId: number) => `${packsUrl}/${packId}`;
    const stickerUrl = (packId: number, stickerId: number) => `${packUrl(packId)}/stickers/${stickerId}`;

    return {
        listPacks: () => getJson<StickerLibraryListing>(packsUrl),
        createPack: (name: string) => postJson<LibraryStickerPackDetail>(packsUrl, { name }),
        getPack: (packId: number) => getJson<LibraryStickerPackDetail>(packUrl(packId)),
        renamePack: (packId: number, name: string) => patchJson<LibraryStickerPackDetail>(packUrl(packId), { name }),
        setPublished: (packId: number, published: boolean) =>
            postJson<LibraryStickerPackDetail>(`${packUrl(packId)}/${published ? 'publish' : 'unpublish'}`, {}),
        deletePack: (packId: number) => deleteJson(packUrl(packId)),
        uploadSticker: (packId: number, file: File, keywords: string[] = []) => {
            const form = new FormData();
            form.append('file', file);
            keywords.forEach(keyword => form.append('keywords[]', keyword));

            return withThrottleRetry(() => postForm<LibrarySticker>(`${packUrl(packId)}/stickers`, form));
        },
        reorderStickers: (packId: number, stickerIds: number[]) =>
            putJson<LibraryStickerPackDetail>(`${packUrl(packId)}/stickers/order`, { sticker_ids: stickerIds }),
        updateSticker: (packId: number, stickerId: number, changes: LibraryStickerChanges) =>
            patchJson<LibrarySticker>(stickerUrl(packId, stickerId), { ...changes }),
        deleteSticker: (packId: number, stickerId: number) => deleteJson(stickerUrl(packId, stickerId)),
    };
}

export type StickerLibraryApi = ReturnType<typeof createStickerLibraryApi>;
