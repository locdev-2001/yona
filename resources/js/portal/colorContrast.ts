// Port của shared/helpers/colorHelper.js#adjustColorForContrast. Bản trước gọi
// color2k (toHex/mix/getLuminance/getContrast); ở đây tự tính trên hệ sRGB để
// khỏi thêm phụ thuộc — cùng công thức WCAG và cùng phép trộn tuyến tính.
const TARGET_CONTRAST_RATIO = 3.1;
const MAX_ITERATIONS = 20;
const MIX_WEIGHT = 0.05;

type Rgb = { r: number; g: number; b: number };

function parseHex(color: string): Rgb {
    const hex = color.trim().replace('#', '');
    const full = hex.length === 3 ? hex.replace(/./g, char => char + char) : hex;

    return {
        r: parseInt(full.slice(0, 2), 16) || 0,
        g: parseInt(full.slice(2, 4), 16) || 0,
        b: parseInt(full.slice(4, 6), 16) || 0,
    };
}

function parseColor(color: string): Rgb {
    if (color.startsWith('#')) return parseHex(color);
    if (color === 'white') return { r: 255, g: 255, b: 255 };
    if (color === 'black') return { r: 0, g: 0, b: 0 };

    return parseHex(color);
}

function toHex({ r, g, b }: Rgb): string {
    const channel = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');

    return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function luminance(color: Rgb): number {
    const channel = (value: number) => {
        const normalized = value / 255;

        return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
    };

    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

function contrast(a: Rgb, b: Rgb): number {
    const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);

    return (lighter + 0.05) / (darker + 0.05);
}

function mix(a: Rgb, b: Rgb, weight: number): Rgb {
    return {
        r: a.r + (b.r - a.r) * weight,
        g: a.g + (b.g - a.g) * weight,
        b: a.b + (b.b - a.b) * weight,
    };
}

export function adjustColorForContrast(color: string, backgroundColor: string): string {
    const background = parseColor(backgroundColor);
    let adjusted = parseColor(color);

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
        if (contrast(adjusted, background) >= TARGET_CONTRAST_RATIO) break;

        adjusted = mix(adjusted, luminance(adjusted) < 0.5 ? { r: 255, g: 255, b: 255 } : parseHex('151718'), MIX_WEIGHT);
    }

    return toHex(adjusted);
}
