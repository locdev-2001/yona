import { format, formatDistanceToNow, fromUnixTime, isSameYear } from 'date-fns';

// Port từ shared/helpers/timeHelper.js (các hàm màn contacts + conversation cần).
export function dynamicTime(time: number): string {
    return formatDistanceToNow(fromUnixTime(time), { addSuffix: true });
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

// Rút gọn chuỗi formatDistanceToNow thành 1m/1h/1d/1mo/1y như bản gốc.
export function shortTimestamp(time: string, withAgo = false): string {
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
