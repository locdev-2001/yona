// getContrastingTextColor của @chatwoot/utils — package không có type declaration
// cho hàm này nên port thẳng (cùng công thức, cùng ngưỡng 186).
export const getContrastingTextColor = (bgColor: string): string => {
    const color = (bgColor || '').replace('#', '');
    const red = parseInt(color.slice(0, 2), 16);
    const green = parseInt(color.slice(2, 4), 16);
    const blue = parseInt(color.slice(4, 6), 16);

    return red * 0.299 + green * 0.587 + blue * 0.114 > 186 ? '#000000' : '#FFFFFF';
};
