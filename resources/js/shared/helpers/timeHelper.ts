import { format, formatDistanceToNow, fromUnixTime, isSameYear } from 'date-fns';
import { enUS, vi } from 'date-fns/locale';
import type { Locale } from 'date-fns';

// Port từ shared/helpers/timeHelper.js (các hàm màn contacts + conversation cần).

// Ngôn ngữ của date-fns cho mọi chuỗi thời gian đọc thành câu. Locale của lần
// render do máy chủ quyết và in ra ở thẻ <html lang> — cùng nguồn mà i18n dùng,
// đọc thẳng ở đây để widget/portal không phải kéo theo bundle chuỗi dịch.
const DATE_FNS_LOCALES: Record<string, Locale> = { en: enUS, vi };

function activeDateFnsLocale(): Locale {
    if (typeof document === 'undefined') return enUS;
    const language = document.documentElement.lang.replace('_', '-').split('-')[0].toLowerCase();

    return DATE_FNS_LOCALES[language] ?? enUS;
}

// Khác biệt CỐ Ý so với gốc: gốc không truyền locale nên luôn ra tiếng Anh
// ("about 1 hour ago"). Sản phẩm chạy tiếng Việt nên chuỗi này phải dịch.
export function dynamicTime(time: number): string {
    return formatDistanceToNow(fromUnixTime(time), { addSuffix: true, locale: activeDateFnsLocale() });
}

export function messageStamp(time: number, dateFormat = 'h:mm a'): string {
    return format(fromUnixTime(time), dateFormat);
}

export function messageTimestamp(time: number, dateFormat = 'MMM d, yyyy'): string {
    const messageTime = fromUnixTime(time);
    if (!isSameYear(messageTime, new Date())) {
        return format(messageTime, 'LLL d y, h:mm a');
    }
    return format(messageTime, dateFormat);
}

export function dateFormat(time: number, df = 'MMM d, yyyy'): string {
    return format(fromUnixTime(time), df);
}

// Dạng rút gọn (1m/1h/3d) bám gốc nên giữ nguyên ở mọi ngôn ngữ. Các hàm rút gọn
// đều cắt chuỗi tiếng Anh, vì vậy chúng dựng chuỗi từ đây chứ không qua
// `dynamicTime` — hàm đó đã dịch theo locale.
export function distanceToNowInEnglish(time: number): string {
    return formatDistanceToNow(fromUnixTime(time), { addSuffix: true });
}

// Rút gọn chuỗi formatDistanceToNow thành 1m/1h/1d/1mo/1y như bản gốc.
export function shortTimestamp(time: string | number, withAgo = false): string {
    if (typeof time === 'number') {
        return shortTimestamp(distanceToNowInEnglish(time), withAgo);
    }

    const suffix = withAgo ? ' ago' : '';
    const timeMappings: Record<string, string> = {
        'less than a minute ago': 'now',
        'in less than a minute': 'now',
        'a minute ago': `1m${suffix}`,
        'an hour ago': `1h${suffix}`,
        'a day ago': `1d${suffix}`,
        'a month ago': `1mo${suffix}`,
        'a year ago': `1y${suffix}`,
    };
    if (timeMappings[time]) {
        return timeMappings[time];
    }
    return time
        .replace(/about|over|almost|/g, '')
        .replace(' minute ago', `m${suffix}`)
        .replace(' minutes ago', `m${suffix}`)
        .replace(' hour ago', `h${suffix}`)
        .replace(' hours ago', `h${suffix}`)
        .replace(' day ago', `d${suffix}`)
        .replace(' days ago', `d${suffix}`)
        .replace(' month ago', `mo${suffix}`)
        .replace(' months ago', `mo${suffix}`)
        .replace(' year ago', `y${suffix}`)
        .replace(' years ago', `y${suffix}`);
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
