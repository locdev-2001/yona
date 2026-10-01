import { router } from '@inertiajs/react';

import { getLocale } from '../../i18n';

// Định dạng dùng chung cho các trang vận hành của console (sức khoẻ kênh,
// account 360, nhật ký, dữ liệu): theo ngôn ngữ đang hiển thị.
function intlLocale(): string {
    const locale = getLocale().replace('_', '-');

    return locale === 'vi' ? 'vi-VN' : locale;
}

export function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return '-';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    return new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export function formatDate(iso: string | null | undefined): string {
    if (!iso) return '-';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    return new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'medium' }).format(date);
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 3600],
    ['month', 30 * 24 * 3600],
    ['week', 7 * 24 * 3600],
    ['day', 24 * 3600],
    ['hour', 3600],
    ['minute', 60],
];

export function formatRelative(iso: string | null | undefined, now: number = Date.now()): string {
    if (!iso) return '-';
    const time = new Date(iso).getTime();
    if (Number.isNaN(time)) return iso;
    const seconds = Math.round((time - now) / 1000);
    const formatter = new Intl.RelativeTimeFormat(intlLocale(), { numeric: 'auto' });

    for (const [unit, size] of RELATIVE_STEPS) {
        if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
    }

    return formatter.format(0, 'minute');
}

export function formatNumber(value: number): string {
    return new Intl.NumberFormat(intlLocale()).format(value);
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number): string {
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: unit === 0 ? 0 : 1 }).format(value)} ${BYTE_UNITS[unit]}`;
}

// Đổi tham số lọc trên URL hiện tại (bỏ khoá rỗng, về trang 1), giữ cuộn và trạng thái.
export function visitWithParams(url: string, params: Record<string, string | undefined>): void {
    const query = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));
    router.get(url, query, { preserveState: true, preserveScroll: true, replace: true });
}
