import { describe, expect, it } from 'vitest';

import { colorChange, hexToRgba, isValidHex, rgbToHex, rgbToHsl, rgbToHsv } from './colorHelper';

describe('isValidHex', () => {
    it.each(['#fff', '#FFFFFF', 'abc123', '#12345678'])('nhận %s', hex => {
        expect(isValidHex(hex)).toBe(true);
    });

    it.each(['', '#12345', 'không phải màu', '#gggggg'])('từ chối %s', hex => {
        expect(isValidHex(hex)).toBe(false);
    });
});

describe('hexToRgba', () => {
    it('mở rộng dạng 3 ký tự', () => {
        expect(hexToRgba('#0f8')).toEqual({ r: 0, g: 255, b: 136, a: 1 });
    });

    it('đọc alpha từ dạng 8 ký tự', () => {
        expect(hexToRgba('#ff000080').a).toBeCloseTo(128 / 255, 5);
    });
});

describe('rgbToHex', () => {
    it('làm tròn và viết hoa như tinycolor.toHexString', () => {
        expect(rgbToHex({ r: 254.6, g: 0, b: 17 })).toBe('#FF0011');
    });
});

describe('rgbToHsl / rgbToHsv', () => {
    it('đỏ nguyên chất', () => {
        expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 1, l: 0.5 });
        expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 1, v: 1 });
    });

    it('xám không có sắc độ', () => {
        expect(rgbToHsl({ r: 128, g: 128, b: 128 }).s).toBe(0);
    });
});

describe('colorChange', () => {
    it('từ hex ra đủ hsl/hsv/rgba', () => {
        const color = colorChange('#1f93ff');

        expect(color.hex).toBe('#1F93FF');
        expect(color.rgba).toEqual({ r: 31, g: 147, b: 255, a: 1 });
        expect(color.hsv.v).toBeCloseTo(1, 5);
    });

    it('từ hsva của vùng saturation', () => {
        expect(colorChange({ h: 0, s: 1, v: 1, a: 1, source: 'hsva' }).hex).toBe('#FF0000');
    });

    it('từ hsla của thanh hue', () => {
        expect(colorChange({ h: 120, s: 1, l: 0.5, a: 1, source: 'hsl' }).hex).toBe('#00FF00');
    });

    it('giữ hue cũ khi màu xám (s = 0)', () => {
        expect(colorChange('#808080', 210).hsl.h).toBe(210);
    });

    it('hex sai định dạng rơi về đen thay vì NaN', () => {
        expect(colorChange('không phải màu').hex).toBe('#000000');
    });
});
