import { getLocale } from '../../i18n';

function intlLocale(): string {
    return getLocale().replace('_', '-');
}

export function formatNumber(value: number): string {
    return new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1 }).format(value);
}

export function formatPercent(value: number | null): string {
    return value === null ? '-' : new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1 }).format(value);
}

// Ngày dạng Y-m-d từ máy chủ, hiển thị ngày/tháng; không đi qua Date để khỏi lệch múi giờ.
export function formatDay(date: string): string {
    const [, month, day] = date.split('-');

    return `${day}/${month}`;
}

export function formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
        value /= 1024;
        unit++;
    }

    return `${formatNumber(Math.round(value * 10) / 10)} ${BYTE_UNITS[unit]}`;
}
