import {
    add,
    addWeeks,
    format,
    getUnixTime,
    isMonday,
    isSameYear,
    isToday,
    setHours,
    setMinutes,
    setSeconds,
    startOfMonth,
    startOfWeek,
} from 'date-fns';

import { SNOOZE_OPTIONS } from 'dashboard/constants/globals';
import { distanceToNowInEnglish } from 'shared/helpers/timeHelper';

// Port từ dashboard/helper/snoozeHelpers.js. Bỏ ở B5: generateSnoozeSuggestions
// (cần cả cây snoozeDateParser ~1.7k dòng — gợi ý NLP khi gõ, nợ B10).

export const findStartOfNextWeek = (currentDate: Date): Date => {
    const startOfNextWeek = startOfWeek(addWeeks(currentDate, 1));
    return isMonday(startOfNextWeek)
        ? startOfNextWeek
        : add(startOfNextWeek, { days: (8 - startOfNextWeek.getDay()) % 7 });
};

export const findStartOfNextMonth = (currentDate: Date): Date => {
    const startOfNextMonth = startOfMonth(add(currentDate, { months: 1 }));
    return isMonday(startOfNextMonth)
        ? startOfNextMonth
        : add(startOfNextMonth, { days: (8 - startOfNextMonth.getDay()) % 7 });
};

export const findNextDay = (currentDate: Date): Date => add(currentDate, { days: 1 });

export const setHoursToNine = (date: Date): Date => setSeconds(setMinutes(setHours(date, 9), 0), 0);

const SNOOZE_RESOLVERS: Partial<Record<string, (date: Date) => Date>> = {
    [SNOOZE_OPTIONS.AN_HOUR_FROM_NOW]: date => add(date, { hours: 1 }),
    [SNOOZE_OPTIONS.UNTIL_TOMORROW]: date => setHoursToNine(findNextDay(date)),
    [SNOOZE_OPTIONS.UNTIL_NEXT_WEEK]: date => setHoursToNine(findStartOfNextWeek(date)),
    [SNOOZE_OPTIONS.UNTIL_NEXT_MONTH]: date => setHoursToNine(findStartOfNextMonth(date)),
};

// Epoch giây của mốc mở lại; until_next_reply/custom → null.
export const findSnoozeTime = (snoozeType: string, currentDate: Date = new Date()): number | null => {
    const resolve = SNOOZE_RESOLVERS[snoozeType];
    return resolve ? getUnixTime(resolve(currentDate)) : null;
};

export const snoozedReopenTime = (snoozedUntil: string | null | undefined): string | null => {
    if (!snoozedUntil) return null;
    const date = new Date(snoozedUntil);
    if (isToday(date)) return format(date, 'h.mmaaa');
    if (!isSameYear(date, new Date())) return format(date, 'd MMM yyyy, h.mmaaa');
    return format(date, 'd MMM, h.mmaaa');
};

export const snoozedReopenTimeToTimestamp = (snoozedUntil: string | null | undefined): number | null =>
    snoozedUntil ? getUnixTime(new Date(snoozedUntil)) : null;

const UNIT_SHORT: Record<string, string> = {
    minute: 'm',
    minutes: 'm',
    hour: 'h',
    hours: 'h',
    day: 'd',
    days: 'd',
    month: 'mo',
    months: 'mo',
    year: 'y',
    years: 'y',
};

// Nhận mốc thời gian (unix) hoặc sẵn chuỗi tiếng Anh: phép rút gọn cắt chữ
// tiếng Anh nên không dùng được chuỗi đã dịch theo locale.
export const shortenSnoozeTime = (snoozedUntil: string | number | null | undefined): string | null => {
    if (!snoozedUntil) return null;
    if (typeof snoozedUntil === 'number') return shortenSnoozeTime(distanceToNowInEnglish(snoozedUntil));

    return snoozedUntil
        .replace(/^in\s+/i, '')
        .replace(/\s(minute|hour|day|month|year)s?\b/gi, (match, unit: string) => UNIT_SHORT[unit.toLowerCase()] || match);
};
