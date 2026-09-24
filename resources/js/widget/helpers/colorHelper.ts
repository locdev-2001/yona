// Chọn màu chữ tương phản với nền (ngưỡng độ sáng 186). Thư viện tiện ích dùng chung
// không khai type cho hàm này nên viết lại cùng công thức.
export const getContrastingTextColor = (bgColor: string): string => {
    const color = (bgColor || '').replace('#', '');
    const red = parseInt(color.slice(0, 2), 16);
    const green = parseInt(color.slice(2, 4), 16);
    const blue = parseInt(color.slice(4, 6), 16);

    return red * 0.299 + green * 0.587 + blue * 0.114 > 186 ? '#000000' : '#FFFFFF';
};
