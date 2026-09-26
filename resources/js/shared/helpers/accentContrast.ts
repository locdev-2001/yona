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

// Luật DUY NHẤT cho chữ/icon đặt trên màu nhấn tenant chọn (launcher của SDK, nút và
// chữ màu nhấn trong widget): nền sáng tới mức chữ mực tương phản hơn chữ trắng (so tỉ
// lệ tương phản WCAG hai bên) thì dùng mực. Ví dụ #009CE0: chữ trắng chỉ 3.1:1, mực trên 5:1.
export const isLightAccent = (accentColor: string): boolean => {
    const luminance = relativeLuminance(accentColor);
    if (luminance === null) return false;

    const contrastWithInk = (luminance + 0.05) / 0.05;
    const contrastWithWhite = 1.05 / (luminance + 0.05);

    return contrastWithInk > contrastWithWhite;
};

/**
 * Tỉ lệ tương phản (công thức WCAG) giữa chữ trắng và màu nhấn — dùng để hiện
 * dòng "Chữ trắng đọc tốt trên màu này (x.x:1)" ở màn cấu hình widget. Trả về
 * null khi không đọc được mã màu, để nơi gọi tự quyết định hiện gì.
 */
export const contrastRatioWithWhite = (accentColor: string): number | null => {
    const luminance = relativeLuminance(accentColor);
    if (luminance === null) return null;

    return 1.05 / (luminance + 0.05);
};
