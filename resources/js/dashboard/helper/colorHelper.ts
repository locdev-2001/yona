// Thay cho tinycolor2 (phụ thuộc gián tiếp của @lk77/vue3-color mà ColorPicker
// của Chatwoot dùng) — chỉ giữ đúng phần đổi hệ màu Chrome picker cần.
export interface RgbaColor {
    r: number;
    g: number;
    b: number;
    a: number;
}

export interface HslaColor {
    h: number;
    s: number;
    l: number;
    a: number;
}

export interface HsvaColor {
    h: number;
    s: number;
    v: number;
    a: number;
}

export interface PickerColor {
    hsl: HslaColor;
    hex: string;
    rgba: RgbaColor;
    hsv: HsvaColor;
    oldHue: number;
    source?: string;
    a: number;
}

// Dữ liệu vào của colorChange: hex, hoặc bộ hsva/hsla/rgba kèm `source`.
export interface ColorInput {
    hex?: string;
    r?: number;
    g?: number;
    b?: number;
    h?: number;
    s?: number;
    l?: number;
    v?: number;
    a?: number;
    source?: string;
}

const HEX_PATTERN = /^#?(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function isValidHex(hex: string): boolean {
    return HEX_PATTERN.test(hex.trim());
}

export function hexToRgba(hex: string): RgbaColor {
    let body = hex.trim().replace(/^#/, '');
    if (body.length === 3 || body.length === 4) {
        body = body
            .split('')
            .map(character => character + character)
            .join('');
    }
    const value = parseInt(body.slice(0, 6), 16);

    return {
        r: (value >> 16) & 255,
        g: (value >> 8) & 255,
        b: value & 255,
        a: body.length === 8 ? parseInt(body.slice(6, 8), 16) / 255 : 1,
    };
}

export function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
    const channel = (value: number) =>
        Math.round(Math.min(255, Math.max(0, value)))
            .toString(16)
            .padStart(2, '0');

    return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const lightness = (max + min) / 2;

    if (max === min) return { h: 0, s: 0, l: lightness };

    const delta = max - min;
    const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    let hue: number;
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;

    return { h: (hue / 6) * 360, s: saturation, l: lightness };
}

export function rgbToHsv({ r, g, b }: { r: number; g: number; b: number }): { h: number; s: number; v: number } {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const delta = max - min;
    const saturation = max === 0 ? 0 : delta / max;

    if (max === min) return { h: 0, s: saturation, v: max };

    let hue: number;
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;

    return { h: (hue / 6) * 360, s: saturation, v: max };
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
    const hue = (((h % 360) + 360) % 360) / 60;
    const saturation = clamp01(s);
    const value = clamp01(v);
    const sector = Math.floor(hue);
    const fraction = hue - sector;
    const p = value * (1 - saturation);
    const q = value * (1 - fraction * saturation);
    const t = value * (1 - (1 - fraction) * saturation);
    const index = sector % 6;
    const red = [value, q, p, p, t, value][index];
    const green = [t, value, value, q, p, p][index];
    const blue = [p, p, t, value, value, q][index];

    return { r: red * 255, g: green * 255, b: blue * 255 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    const hue = (((h % 360) + 360) % 360) / 360;
    const saturation = clamp01(s);
    const lightness = clamp01(l);

    if (saturation === 0) {
        const gray = lightness * 255;

        return { r: gray, g: gray, b: gray };
    }

    const channel = (p: number, q: number, offset: number) => {
        let position = offset;
        if (position < 0) position += 1;
        if (position > 1) position -= 1;
        if (position < 1 / 6) return p + (q - p) * 6 * position;
        if (position < 1 / 2) return q;
        if (position < 2 / 3) return p + (q - p) * (2 / 3 - position) * 6;

        return p;
    };

    const q = lightness < 0.5 ? lightness * (1 + saturation) : lightness + saturation - lightness * saturation;
    const p = 2 * lightness - q;

    return {
        r: channel(p, q, hue + 1 / 3) * 255,
        g: channel(p, q, hue) * 255,
        b: channel(p, q, hue - 1 / 3) * 255,
    };
}

// Port từ mixin/color.js `_colorChange` của @lk77/vue3-color.
export function colorChange(input: ColorInput | string, oldHue = 0): PickerColor {
    const data: ColorInput = typeof input === 'string' ? { hex: input } : (input ?? {});
    let rgb: { r: number; g: number; b: number };

    if (data.h !== undefined && data.s !== undefined && data.l !== undefined) {
        rgb = hslToRgb(data.h, data.s, data.l);
    } else if (data.h !== undefined && data.s !== undefined && data.v !== undefined) {
        rgb = hsvToRgb(data.h, data.s, data.v);
    } else if (data.r !== undefined && data.g !== undefined && data.b !== undefined) {
        rgb = { r: data.r, g: data.g, b: data.b };
    } else if (data.hex && isValidHex(data.hex)) {
        rgb = hexToRgba(data.hex);
    } else {
        rgb = { r: 0, g: 0, b: 0 };
    }

    const alpha = data.a ?? 1;
    const hsl = rgbToHsl(rgb);
    const hsv = rgbToHsv(rgb);

    if (hsl.s === 0) {
        hsv.h = hsl.h = data.h || oldHue || 0;
    }

    return {
        hsl: { ...hsl, a: alpha },
        hex: rgbToHex(rgb),
        rgba: { r: Math.round(rgb.r), g: Math.round(rgb.g), b: Math.round(rgb.b), a: alpha },
        hsv: { ...hsv, a: alpha },
        oldHue: data.h || oldHue || hsl.h,
        source: data.source,
        a: alpha,
    };
}
