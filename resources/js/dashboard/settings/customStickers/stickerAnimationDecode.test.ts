import { describe, expect, it } from 'vitest';

import { animationFrameSize, canDecodeAnimation, decodeAnimation, MAX_PREVIEW_FRAMES, normalizeFrameDelay, sampleFrameIndices } from './stickerAnimationDecode';

describe('giải mã ảnh động cho bản xem trước', () => {
    it('lấy mẫu tối đa 60 khung trải đều, luôn có khung đầu', () => {
        expect(sampleFrameIndices(6)).toEqual([0, 1, 2, 3, 4, 5]);
        const sampled = sampleFrameIndices(200);
        expect(sampled).toHaveLength(MAX_PREVIEW_FRAMES);
        expect(sampled[0]).toBe(0);
        expect(sampled.at(-1)).toBeLessThan(200);
    });

    it('thu nhỏ khung để mọi khung nằm trong ngân sách bộ nhớ, ảnh nhỏ giữ nguyên', () => {
        expect(animationFrameSize(120, 120, 6)).toEqual({ width: 120, height: 120 });
        const large = animationFrameSize(1000, 500, 60);
        expect(large.width * large.height * 60).toBeLessThanOrEqual(8 * 1024 * 1024);
        expect(large.width / large.height).toBeCloseTo(2, 1);
    });

    it('độ trễ dưới 20ms coi là 100ms như renderer', () => {
        expect(normalizeFrameDelay(10)).toBe(100);
        expect(normalizeFrameDelay(null)).toBe(100);
        expect(normalizeFrameDelay(70)).toBe(70);
    });

    it('trình duyệt thiếu ImageDecoder thì trả null để lùi về Vừa khung', async () => {
        expect(canDecodeAnimation()).toBe(false);
        expect(await decodeAnimation(new ArrayBuffer(8), 'image/gif')).toBeNull();
    });
});
