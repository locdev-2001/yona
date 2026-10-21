import { format, formatDistanceToNow, fromUnixTime, isSameYear } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import type { FormatDistanceToken, Locale } from 'date-fns';

import { t } from '../../i18n';

// Port từ shared/helpers/timeHelper.js (các hàm màn contacts + conversation cần).

// Ngôn ngữ của date-fns cho mọi chuỗi thời gian đọc thành câu. Locale của lần
// render do máy chủ quyết và in ra ở thẻ <html lang> — cùng nguồn mà i18n dùng.
const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, vi };

function activeDateFnsLocale(): Locale {
    if (typeof document === 'undefined') return enUS;
    const language = document.documentElement.lang.replace('_', '-').split('-')[0].toLowerCase();

    return DATE_FNS_LOCALES[language] ?? enUS;
}

// Mẫu định dạng của bản gốc viết theo thói quen tiếng Anh ("Sep 7, 10:37 PM").
// Giữ nguyên chữ ký hàm (nơi gọi vẫn truyền mẫu cũ) nhưng đổi sang mẫu
// tương đương của locale — một chỗ duy nhất, thêm ngôn ngữ chỉ cần thêm một hàng.
// KHÁC BIỆT CỐ Ý so với gốc: gốc in ngày giờ tiếng Anh ở mọi ngôn ngữ.
const PATTERN_BY_LOCALE: Record<string, Record<string, string>> = {
    vi: {
        'h:mm a': 'HH:mm',
        'h:mm:ss a': 'HH:mm:ss',
        'LLL d, h:mm a': 'd MMM, HH:mm',
        'LLL d y, h:mm a': 'd MMM y, HH:mm',
        'LLL d yyyy, h:mm a': 'd MMM yyyy, HH:mm',
        'MMM d, yyyy': 'd MMM, yyyy',
        'dd MMM yyyy, h:mm a': 'dd MMM yyyy, HH:mm',
        'MMM-yyyy': 'MMM yyyy',
        'dd-MMM': 'dd MMM',
    },
};

function localizedPattern(pattern: string): string {
    const language = activeDateFnsLocale().code?.split('-')[0] ?? 'en';

    return PATTERN_BY_LOCALE[language]?.[pattern] ?? pattern;
}

export function formatInLocale(time: number | Date, pattern: string): string {
    const value = typeof time === 'number' ? fromUnixTime(time) : time;

    return format(value, localizedPattern(pattern), { locale: activeDateFnsLocale() });
}

// Mốc giờ lưu dạng chuỗi trong thuộc tính hội thoại có hai kiểu: máy chủ ghi
// "YYYY-MM-DD HH:mm:ss" theo UTC mà không kèm múi giờ, trình duyệt ghi chuỗi
// tự mang múi giờ (ISO, Date#toString). Không đọc được thì trả null.
const ZONELESS_UTC_STAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function parseStoredTimestamp(value: string): Date | null {
    const parsed = new Date(ZONELESS_UTC_STAMP.test(value) ? `${value.replace(' ', 'T')}Z` : value);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// Khác biệt CỐ Ý so với gốc: gốc không truyền locale nên luôn ra tiếng Anh
// ("about 1 hour ago"). Sản phẩm chạy tiếng Việt nên chuỗi này phải dịch.
export function dynamicTime(time: number): string {
    return formatDistanceToNow(fromUnixTime(time), { addSuffix: true, locale: activeDateFnsLocale() });
}

export function messageStamp(time: number, dateFormat = 'h:mm a'): string {
    return formatInLocale(time, dateFormat);
}

export function messageTimestamp(time: number, dateFormat = 'MMM d, yyyy'): string {
    const messageTime = fromUnixTime(time);
    if (!isSameYear(messageTime, new Date())) {
        return formatInLocale(messageTime, 'LLL d y, h:mm a');
    }

    return formatInLocale(messageTime, dateFormat);
}

export function dateFormat(time: number, df = 'MMM d, yyyy'): string {
    return formatInLocale(time, df);
}

// Mốc rút gọn cho cột thời gian hẹp: date-fns làm tròn khoảng cách thành token
// (xMinutes, aboutXHours…), đơn vị ngắn lấy từ lang/{locale}/time_ago.php.
const SHORT_UNIT_BY_TOKEN: Record<FormatDistanceToken, string> = {
    lessThanXSeconds: 'NOW',
    xSeconds: 'NOW',
    halfAMinute: 'NOW',
    lessThanXMinutes: 'NOW',
    xMinutes: 'MINUTES',
    aboutXHours: 'HOURS',
    xHours: 'HOURS',
    xDays: 'DAYS',
    aboutXWeeks: 'WEEKS',
    xWeeks: 'WEEKS',
    aboutXMonths: 'MONTHS',
    xMonths: 'MONTHS',
    aboutXYears: 'YEARS',
    xYears: 'YEARS',
    overXYears: 'YEARS',
    almostXYears: 'YEARS',
};

function shortDistanceLocale(withAgo: boolean): Locale {
    return {
        ...enUS,
        formatDistance: (token, count) => {
            const unit = SHORT_UNIT_BY_TOKEN[token];
            if (unit === 'NOW') return t('TIME_AGO.SHORT.NOW');

            const distance = t(`TIME_AGO.SHORT.${unit}`, { count });
            return withAgo ? t('TIME_AGO.SHORT.AGO', { time: distance }) : distance;
        },
    };
}

// Nhận cả mốc quá khứ lẫn tương lai (hạn tạm ẩn); không kèm "trước" thì chỉ là độ dài.
export function shortTimestamp(time: number, withAgo = false): string {
    return formatDistanceToNow(fromUnixTime(time), { locale: shortDistanceLocale(withAgo) });
}

// formatDuration: mm:ss, thêm hh khi đủ giờ; giá trị rỗng/âm trả chuỗi rỗng.
export function formatDuration(durationInSeconds: number | string | null | undefined): string {
    if (durationInSeconds === null || durationInSeconds === undefined) return '';

    const totalSeconds = Number(durationInSeconds);
    if (Number.isNaN(totalSeconds) || totalSeconds < 0) return '';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedMinutes = String(minutes).padStart(2, '0');
    const paddedSeconds = String(seconds).padStart(2, '0');

    if (hours > 0) return `${String(hours).padStart(2, '0')}:${paddedMinutes}:${paddedSeconds}`;

    return `${paddedMinutes}:${paddedSeconds}`;
}
