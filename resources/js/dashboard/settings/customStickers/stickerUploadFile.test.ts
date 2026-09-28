import { describe, expect, it, vi } from 'vitest';

import { prepareStickerUpload, StickerFileTooLargeError, UPLOAD_MAX_EDGE } from './stickerUploadFile';
import type { InspectedStickerImage, StickerImageInspector } from './stickerUploadFile';

// Dung lượng thu nhỏ 1024 lần (1 "MB" = 1 KB) để test không cấp phát hàng chục MB.
const MB = 1024;
const LIMIT = 10 * MB;

const fileOfSize = (name: string, bytes: number, type = 'image/png') => new File([new Uint8Array(bytes)], name, { type });

interface FakeImage {
    width: number;
    height: number;
    animated?: boolean;
    transparent?: boolean;
    // Cỡ tệp (byte) bộ mã hoá giả trả về theo loại ảnh và số điểm ảnh.
    encodedBytes?: (type: string, pixels: number) => number;
}

function fakeInspector({ width, height, animated = false, transparent = false, encodedBytes = () => MB }: FakeImage) {
    const rasterized: [number, number][] = [];
    const encoded: { type: string; quality?: number }[] = [];
    const release = vi.fn();
    const inspect: StickerImageInspector = async () =>
        ({
            width,
            height,
            animated,
            rasterize: (targetWidth, targetHeight) => {
                rasterized.push([targetWidth, targetHeight]);
                return {
                    hasTransparency: () => transparent,
                    encode: async (type, quality) => {
                        encoded.push({ type, quality });
                        return new Blob([new Uint8Array(encodedBytes(type, targetWidth * targetHeight))], { type });
                    },
                };
            },
            release,
        }) satisfies InspectedStickerImage;

    return { inspect, rasterized, encoded, release };
}

describe('chuẩn bị tệp sticker trước khi gửi', () => {
    it('ảnh đã vừa cạnh và dung lượng thì gửi nguyên tệp gốc', async () => {
        const file = fileOfSize('meo.png', 2 * MB);
        const fake = fakeInspector({ width: 1200, height: 900 });

        await expect(prepareStickerUpload(file, LIMIT, fake.inspect)).resolves.toBe(file);
        expect(fake.rasterized).toEqual([]);
        expect(fake.release).toHaveBeenCalledTimes(1);
    });

    it('ảnh tĩnh cạnh dài quá 2048 thu về 2048 giữ tỉ lệ; ảnh không trong suốt mã hoá JPEG 0.92', async () => {
        const fake = fakeInspector({ width: 6000, height: 4500 });

        const prepared = await prepareStickerUpload(fileOfSize('anh-chup.jpeg', 3 * MB, 'image/jpeg'), LIMIT, fake.inspect);

        expect(fake.rasterized).toEqual([[UPLOAD_MAX_EDGE, 1536]]);
        expect(fake.encoded).toEqual([{ type: 'image/jpeg', quality: 0.92 }]);
        expect(prepared.name).toBe('anh-chup.jpg');
        expect(prepared.type).toBe('image/jpeg');
    });

    it('ảnh trong suốt giữ PNG; cạnh nhỏ mà tệp quá nặng vẫn mã hoá lại ở cỡ cũ', async () => {
        const fake = fakeInspector({ width: 1500, height: 1500, transparent: true, encodedBytes: () => 4 * MB });

        const prepared = await prepareStickerUpload(fileOfSize('nen-trong.png', 14 * MB), LIMIT, fake.inspect);

        expect(fake.rasterized).toEqual([[1500, 1500]]);
        expect(fake.encoded.map(entry => entry.type)).toEqual(['image/png']);
        expect(prepared.name).toBe('nen-trong.png');
        expect(prepared.size).toBe(4 * MB);
    });

    it('PNG trong suốt vẫn quá nặng thì dùng WebP nếu nhẹ hơn', async () => {
        const fake = fakeInspector({
            width: 3000,
            height: 3000,
            transparent: true,
            encodedBytes: type => (type === 'image/png' ? 12 * MB : 3 * MB),
        });

        const prepared = await prepareStickerUpload(fileOfSize('to.png', 30 * MB), LIMIT, fake.inspect);

        expect(fake.encoded.map(entry => entry.type)).toEqual(['image/png', 'image/webp']);
        expect(prepared.type).toBe('image/webp');
        expect(prepared.name).toBe('to.webp');
    });

    it('thu nhỏ tiếp từng nấc tới khi vừa dung lượng', async () => {
        const fake = fakeInspector({ width: 4096, height: 4096, encodedBytes: (_, pixels) => Math.round(pixels / 256) });

        const prepared = await prepareStickerUpload(fileOfSize('rat-to.png', 40 * MB), 8 * MB, fake.inspect);

        expect(fake.rasterized.map(([width]) => width)).toEqual([2048, 1638, 1310]);
        expect(prepared.size).toBeLessThanOrEqual(8 * MB);
    });

    it('thu nhỏ đủ số lần mà vẫn quá nặng thì báo lỗi, không gửi', async () => {
        const fake = fakeInspector({ width: 4000, height: 4000, encodedBytes: () => 20 * MB });

        await expect(prepareStickerUpload(fileOfSize('nhieu.png', 50 * MB), LIMIT, fake.inspect)).rejects.toBeInstanceOf(StickerFileTooLargeError);
        expect(fake.rasterized).toHaveLength(4);
        expect(fake.release).toHaveBeenCalledTimes(1);
    });

    it('ảnh động gửi nguyên kể cả cạnh lớn; nặng quá giới hạn thì báo lỗi', async () => {
        const light = fileOfSize('vay.gif', 4 * MB, 'image/gif');
        const heavy = fileOfSize('nang.gif', 12 * MB, 'image/gif');
        const fake = fakeInspector({ width: 3000, height: 3000, animated: true });

        await expect(prepareStickerUpload(light, LIMIT, fake.inspect)).resolves.toBe(light);
        await expect(prepareStickerUpload(heavy, LIMIT, fake.inspect)).rejects.toBeInstanceOf(StickerFileTooLargeError);
        expect(fake.rasterized).toEqual([]);
    });

    it('máy chủ chưa báo giới hạn thì chỉ thu cạnh, không chặn dung lượng', async () => {
        const fake = fakeInspector({ width: 1000, height: 800 });
        const file = fileOfSize('vua.png', 30 * MB);

        await expect(prepareStickerUpload(file, 0, fake.inspect)).resolves.toBe(file);
    });
});
