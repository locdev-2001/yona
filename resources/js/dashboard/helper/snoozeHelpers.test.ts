import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SNOOZE_OPTIONS } from 'dashboard/constants/globals';
import {
    findSnoozeTime,
    findStartOfNextMonth,
    findStartOfNextWeek,
    shortenSnoozeTime,
    snoozedReopenTime,
    snoozedReopenTimeToTimestamp,
} from './snoozeHelpers';

// Thứ Tư 02/09/2026 14:30 giờ máy.
const NOW = new Date(2026, 8, 2, 14, 30, 0);

describe('findSnoozeTime', () => {
    it('an hour from now', () => {
        expect(findSnoozeTime(SNOOZE_OPTIONS.AN_HOUR_FROM_NOW, NOW)).toBe(
            Math.floor(new Date(2026, 8, 2, 15, 30, 0).getTime() / 1000),
        );
    });

    it('until tomorrow = 9h sáng hôm sau', () => {
        expect(findSnoozeTime(SNOOZE_OPTIONS.UNTIL_TOMORROW, NOW)).toBe(
            Math.floor(new Date(2026, 8, 3, 9, 0, 0).getTime() / 1000),
        );
    });

    it('until next week = thứ Hai tuần sau 9h', () => {
        const nextWeek = findStartOfNextWeek(NOW);
        expect(nextWeek.getDay()).toBe(1);
        expect(findSnoozeTime(SNOOZE_OPTIONS.UNTIL_NEXT_WEEK, NOW)).toBe(
            Math.floor(new Date(2026, 8, 7, 9, 0, 0).getTime() / 1000),
        );
    });

    it('until next month = thứ Hai đầu tiên của tháng sau 9h', () => {
        const nextMonth = findStartOfNextMonth(NOW);
        expect(nextMonth.getDay()).toBe(1);
        expect(findSnoozeTime(SNOOZE_OPTIONS.UNTIL_NEXT_MONTH, NOW)).toBe(
            Math.floor(new Date(2026, 9, 5, 9, 0, 0).getTime() / 1000),
        );
    });

    it('until next reply / custom → null', () => {
        expect(findSnoozeTime(SNOOZE_OPTIONS.UNTIL_NEXT_REPLY, NOW)).toBeNull();
        expect(findSnoozeTime(SNOOZE_OPTIONS.UNTIL_CUSTOM_TIME, NOW)).toBeNull();
    });
});

describe('snoozedReopenTime', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(NOW);
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('null khi không có mốc', () => {
        expect(snoozedReopenTime(null)).toBeNull();
        expect(snoozedReopenTime(undefined)).toBeNull();
    });

    it('cùng ngày chỉ hiện giờ', () => {
        expect(snoozedReopenTime(new Date(2026, 8, 2, 15, 30).toISOString())).toBe('3.30pm');
    });

    it('cùng năm: ngày tháng + giờ', () => {
        expect(snoozedReopenTime(new Date(2026, 8, 7, 9, 0).toISOString())).toBe('7 Sep, 9.00am');
    });

    it('khác năm thêm năm', () => {
        expect(snoozedReopenTime(new Date(2027, 0, 4, 9, 0).toISOString())).toBe('4 Jan 2027, 9.00am');
    });

    it('snoozedReopenTimeToTimestamp trả epoch giây', () => {
        const date = new Date(2026, 8, 7, 9, 0);
        expect(snoozedReopenTimeToTimestamp(date.toISOString())).toBe(Math.floor(date.getTime() / 1000));
        expect(snoozedReopenTimeToTimestamp(null)).toBeNull();
    });
});

describe('shortenSnoozeTime', () => {
    it('rút gọn đơn vị', () => {
        expect(shortenSnoozeTime('in 2 hours')).toBe('2h');
        expect(shortenSnoozeTime('in 3 days')).toBe('3d');
        expect(shortenSnoozeTime('in 1 month')).toBe('1mo');
        expect(shortenSnoozeTime(null)).toBeNull();
    });
});
