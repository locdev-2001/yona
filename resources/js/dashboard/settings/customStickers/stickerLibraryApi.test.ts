import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const postForm = vi.fn();

vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    postForm: (...args: unknown[]) => postForm(...args),
}));

const { ApiError } = await import('dashboard/helper/apiClient');
const { createStickerLibraryApi } = await import('./stickerLibraryApi');

const stickerFile = () => new File(['{}'], 'meo.json', { type: 'application/json' });
const throttled = (retryAfter: number) => new ApiError(429, { message: 'chậm lại', retry_after: retryAfter } as never);

describe('uploadSticker khi máy chủ giới hạn lượt tải', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        postForm.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('chờ đủ retry_after rồi gửi lại đúng tệp đó', async () => {
        postForm.mockRejectedValueOnce(throttled(2)).mockResolvedValueOnce({ id: 7 });
        const api = createStickerLibraryApi('/api/v1/accounts/1');

        const upload = api.uploadSticker(3, stickerFile());
        await vi.advanceTimersByTimeAsync(1999);
        expect(postForm).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);

        await expect(upload).resolves.toEqual({ id: 7 });
        expect(postForm).toHaveBeenCalledTimes(2);
        expect(postForm.mock.calls[1][0]).toBe('/api/v1/accounts/1/sticker_packs/3/stickers');
    });

    it('lỗi khác 429 thì báo ngay, không gửi lại', async () => {
        const rejection = new ApiError(422, { errors: { file: ['Tệp hỏng'] } });
        postForm.mockRejectedValueOnce(rejection);

        await expect(createStickerLibraryApi('/super_admin/api').uploadSticker(3, stickerFile())).rejects.toBe(rejection);
        expect(postForm).toHaveBeenCalledTimes(1);
    });

    it('bị giới hạn mãi thì dừng sau số lần thử có hạn', async () => {
        postForm.mockRejectedValue(throttled(1));

        const upload = createStickerLibraryApi('/super_admin/api').uploadSticker(3, stickerFile());
        const outcome = expect(upload).rejects.toMatchObject({ status: 429 });
        await vi.advanceTimersByTimeAsync(10_000);

        await outcome;
        expect(postForm).toHaveBeenCalledTimes(4);
    });
});
