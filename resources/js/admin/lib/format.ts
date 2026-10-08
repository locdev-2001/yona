// Một cách hiển thị ngày giờ và chữ tắt cho cả console, để cùng một account
// trông giống nhau ở mọi trang.

const pad = (value: number) => String(value).padStart(2, '0');

const toDate = (value: string | number | Date | null | undefined): Date | null => {
    if (value === null || value === undefined || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const EMPTY_VALUE = '-';

// 01/10/2026
export function formatDate(value: string | number | Date | null | undefined): string {
    const date = toDate(value);
    if (!date) return EMPTY_VALUE;
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

// 13:57 01/10/2026
export function formatDateTime(value: string | number | Date | null | undefined): string {
    const date = toDate(value);
    if (!date) return EMPTY_VALUE;
    return `${pad(date.getHours())}:${pad(date.getMinutes())} ${formatDate(date)}`;
}

// 01/10 cho trục biểu đồ
export function formatDayMonth(value: string | number | Date | null | undefined): string {
    const date = toDate(value);
    if (!date) return EMPTY_VALUE;
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

// Chữ đầu của từ đầu và từ cuối: "Nhà thuốc Minh Châu" → "NC", "Nội thất Gỗ Việt" → "NV".
export function initialsOf(name: string | null | undefined): string {
    const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '?';
    const first = Array.from(words[0])[0] ?? '';
    const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? '') : (Array.from(words[0])[1] ?? '');
    return (first + last).toLocaleUpperCase('vi-VN');
}
