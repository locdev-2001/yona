// Độ chói tương đối theo WCAG của một mã màu hex (#rgb hoặc #rrggbb); mã sai thì null.
const relativeLuminance = (hexColor: string): number | null => {
    const hex = (hexColor || '').trim().replace('#', '');
    const fullHex = hex.length === 3 ? hex.replace(/./g, digit => digit + digit) : hex;
    if (!/^[0-9a-f]{6}$/i.test(fullHex)) return null;

    const [red, green, blue] = [0, 2, 4].map(offset => {
        const channel = parseInt(fullHex.slice(offset, offset + 2), 16) / 255;

        return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });

    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

// Nền sáng tới mức chữ tối tương phản hơn chữ trắng (so tỉ lệ tương phản WCAG của hai bên),
// ví dụ màu widget #009CE0: chữ trắng chỉ đạt 3.1:1, chữ tối đạt trên 5:1.
export const isLightBackground = (bgColor: string): boolean => {
    const luminance = relativeLuminance(bgColor);
    if (luminance === null) return false;

    const contrastWithBlack = (luminance + 0.05) / 0.05;
    const contrastWithWhite = 1.05 / (luminance + 0.05);

    return contrastWithBlack > contrastWithWhite;
};

export const getContrastingTextColor = (bgColor: string): string => (isLightBackground(bgColor) ? '#000000' : '#FFFFFF');
