import { describe, expect, it } from 'vitest';

import { isAnimatedImageBytes } from './stickerSourceImage';

const ascii = (text: string) => Array.from(text, character => character.charCodeAt(0));

// GIF tối thiểu: không bảng màu chung, mỗi khung = khối điều khiển đồ hoạ + mô tả ảnh 1×1.
function gif(frameCount: number): Uint8Array {
    const header = [...ascii('GIF89a'), 1, 0, 1, 0, 0x00, 0, 0];
    const frame = [0x21, 0xf9, 4, 0, 10, 0, 0, 0, 0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0x00, 2, 2, 0x4c, 0x01, 0];

    return Uint8Array.from([...header, ...Array.from({ length: frameCount }, () => frame).flat(), 0x3b]);
}

function webp(flags: number): Uint8Array {
    return Uint8Array.from([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'), ...ascii('VP8X'), 10, 0, 0, 0, flags, 0, 0, 0]);
}

describe('nhận ra ảnh động', () => {
    it('GIF nhiều khung là ảnh động, một khung thì không', () => {
        expect(isAnimatedImageBytes(gif(3))).toBe(true);
        expect(isAnimatedImageBytes(gif(1))).toBe(false);
    });

    it('WebP có cờ hoạt ảnh là ảnh động', () => {
        expect(isAnimatedImageBytes(webp(0x02))).toBe(true);
        expect(isAnimatedImageBytes(webp(0x10))).toBe(false);
    });

    it('PNG, JPG không phải ảnh động', () => {
        expect(isAnimatedImageBytes(Uint8Array.from([0x89, ...ascii('PNG'), 13, 10, 26, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false);
        expect(isAnimatedImageBytes(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]))).toBe(false);
    });
});
