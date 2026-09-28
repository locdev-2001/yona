import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { StickerEdit } from './stickerEdit';
import type { StickerUpload } from './stickerLibraryApi';

const postForm = vi.fn();
const patchJson = vi.fn();

vi.mock('dashboard/helper/apiClient', async importOriginal => ({
    ...(await importOriginal<typeof import('dashboard/helper/apiClient')>()),
    postForm: (...args: unknown[]) => postForm(...args),
    patchJson: (...args: unknown[]) => patchJson(...args),
}));

const { ApiError } = await import('dashboard/helper/apiClient');
const { createStickerLibraryApi } = await import('./stickerLibraryApi');

const stickerFile = () => new File(['png'], 'meo.png', { type: 'image/png' });
const EDIT: StickerEdit = {
    crop: { x: 0.1, y: 0.05, w: 0.8, h: 0.8 },
    removeBackground: true,
    tolerance: 12,
    feather: 0,
    edits: [{ op: 'wand-remove', x: 0.5, y: 0.1, tolerance: 12 }],
};
const upload = (overrides: Partial<StickerUpload> = {}): StickerUpload => ({ edit: EDIT, label: null, keywords: [], ...overrides });
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

        const sending = api.uploadSticker(3, stickerFile(), upload());
        await vi.advanceTimersByTimeAsync(1999);
        expect(postForm).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(1);

        await expect(sending).resolves.toEqual({ id: 7 });
        expect(postForm).toHaveBeenCalledTimes(2);
        expect(postForm.mock.calls[1][0]).toBe('/api/v1/accounts/1/sticker_packs/3/stickers');
    });

    it('lỗi khác 429 thì báo ngay, không gửi lại', async () => {
        const rejection = new ApiError(422, { errors: { file: ['Tệp hỏng'] } });
        postForm.mockRejectedValueOnce(rejection);

        await expect(createStickerLibraryApi('/super_admin/api').uploadSticker(3, stickerFile(), upload())).rejects.toBe(rejection);
        expect(postForm).toHaveBeenCalledTimes(1);
    });

    it('bị giới hạn mãi thì dừng sau số lần thử có hạn', async () => {
        postForm.mockRejectedValue(throttled(1));

        const sending = createStickerLibraryApi('/super_admin/api').uploadSticker(3, stickerFile(), upload());
        const outcome = expect(sending).rejects.toMatchObject({ status: 429 });
        await vi.advanceTimersByTimeAsync(10_000);

        await outcome;
        expect(postForm).toHaveBeenCalledTimes(4);
    });
});

describe('từ khoá sticker', () => {
    beforeEach(() => {
        postForm.mockReset();
        patchJson.mockReset();
    });

    it('sửa nhãn và từ khoá đi PATCH vào đúng sticker của bộ', async () => {
        patchJson.mockResolvedValue({ id: 5, keywords: ['haha'] });

        await createStickerLibraryApi('/super_admin/api').updateSticker(3, 5, { label: 'Cười', keywords: ['haha'] });

        expect(patchJson).toHaveBeenCalledWith('/super_admin/api/sticker_packs/3/stickers/5', {
            label: 'Cười',
            keywords: ['haha'],
        });
    });

    it('tải lên gửi ảnh gốc, edit dạng JSON, nhãn và keywords[]; không có nhãn thì không gửi nhãn', async () => {
        postForm.mockResolvedValue({ id: 7 });
        const api = createStickerLibraryApi('/api/v1/accounts/1');
        const file = stickerFile();

        await api.uploadSticker(3, file, upload({ label: 'Mèo vẫy', keywords: ['haha', 'cảm ơn'] }));
        await api.uploadSticker(3, stickerFile(), upload());

        const [url, withDetails] = postForm.mock.calls[0] as [string, FormData];
        const withoutDetails = postForm.mock.calls[1][1] as FormData;
        expect(url).toBe('/api/v1/accounts/1/sticker_packs/3/stickers');
        expect(withDetails.get('file')).toBe(file);
        expect(JSON.parse(withDetails.get('edit') as string)).toEqual(EDIT);
        expect(withDetails.get('label')).toBe('Mèo vẫy');
        expect(withDetails.getAll('keywords[]')).toEqual(['haha', 'cảm ơn']);
        expect(withoutDetails.has('label')).toBe(false);
        expect(withoutDetails.getAll('keywords[]')).toEqual([]);
    });
});
