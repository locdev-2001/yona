import { describe, expect, it } from 'vitest';

import {
    findNextAvailableSlotDetails,
    getDateInTimezone,
    formatClockTime,
    isInWorkingHours,
    isOnline,
    toCamelCaseWorkingHours,
} from './availabilityHelpers';

// Port từ widget/helpers/specs/availabilityHelpers.spec.js. Spec gốc mock
// `utcToZonedTime` của date-fns-tz; bản này quy đổi bằng Intl nên test dùng
// offset thật (`+00:00`) thay cho mock.

const MONDAY_10H_UTC = new Date('2026-09-07T10:00:00.000Z');
const UTC = '+00:00';

describe('getDateInTimezone', () => {
    it('cộng offset dạng ±HH:MM vào giờ địa phương', () => {
        const shifted = getDateInTimezone(MONDAY_10H_UTC, '+07:00');

        expect(shifted.getHours()).toBe(17);
    });

    it('nhận cả tên múi giờ IANA', () => {
        const shifted = getDateInTimezone(MONDAY_10H_UTC, 'Asia/Ho_Chi_Minh');

        expect(shifted.getHours()).toBe(17);
    });
});

describe('isInWorkingHours', () => {
    it('trả false khi chưa cấu hình giờ làm việc', () => {
        expect(isInWorkingHours(MONDAY_10H_UTC, UTC, [])).toBe(false);
    });

    it('trả true khi trong khung giờ của ngày', () => {
        const workingHours = [{ dayOfWeek: 1, openHour: 9, openMinutes: 0, closeHour: 17, closeMinutes: 0 }];

        expect(isInWorkingHours(MONDAY_10H_UTC, UTC, workingHours)).toBe(true);
    });

    it('trả false khi ngoài khung giờ', () => {
        const workingHours = [{ dayOfWeek: 1, openHour: 11, openMinutes: 0, closeHour: 17, closeMinutes: 0 }];

        expect(isInWorkingHours(MONDAY_10H_UTC, UTC, workingHours)).toBe(false);
    });

    it('openAllDay luôn true, closedAllDay luôn false', () => {
        expect(isInWorkingHours(MONDAY_10H_UTC, UTC, [{ dayOfWeek: 1, openAllDay: true }])).toBe(true);
        expect(isInWorkingHours(MONDAY_10H_UTC, UTC, [{ dayOfWeek: 1, closedAllDay: true }])).toBe(false);
    });

    it('khung giờ vắt qua nửa đêm vẫn tính đúng', () => {
        const workingHours = [{ dayOfWeek: 1, openHour: 22, openMinutes: 0, closeHour: 6, closeMinutes: 0 }];

        expect(isInWorkingHours(new Date('2026-09-07T23:30:00.000Z'), UTC, workingHours)).toBe(true);
        expect(isInWorkingHours(MONDAY_10H_UTC, UTC, workingHours)).toBe(false);
    });
});

describe('isOnline', () => {
    const workingHours = [{ dayOfWeek: 1, openHour: 9, openMinutes: 0, closeHour: 17, closeMinutes: 0 }];

    it('tắt giờ làm việc thì chỉ phụ thuộc có agent online', () => {
        expect(isOnline(false, MONDAY_10H_UTC, UTC, workingHours, true)).toBe(true);
        expect(isOnline(false, MONDAY_10H_UTC, UTC, workingHours, false)).toBe(false);
    });

    it('bật giờ làm việc thì cần cả trong giờ lẫn có agent', () => {
        expect(isOnline(true, MONDAY_10H_UTC, UTC, workingHours, true)).toBe(true);
        expect(isOnline(true, new Date('2026-09-07T20:00:00.000Z'), UTC, workingHours, true)).toBe(false);
    });
});

describe('findNextAvailableSlotDetails', () => {
    it('trả null khi mọi ngày đều đóng', () => {
        const workingHours = [{ dayOfWeek: 1, closedAllDay: true }];

        expect(findNextAvailableSlotDetails(MONDAY_10H_UTC, UTC, workingHours)).toBeNull();
    });

    it('tính số phút tới khung giờ mở trong ngày', () => {
        const workingHours = [{ dayOfWeek: 1, openHour: 14, openMinutes: 30, closeHour: 17, closeMinutes: 0 }];

        const slot = findNextAvailableSlotDetails(MONDAY_10H_UTC, UTC, workingHours);

        expect(slot?.minutesUntilOpen).toBe(270);
        expect(slot?.daysUntilOpen).toBe(0);
    });

    it('nhảy sang ngày mở kế tiếp khi hôm nay đã qua giờ mở', () => {
        const workingHours = [
            { dayOfWeek: 1, openHour: 9, openMinutes: 0, closeHour: 10, closeMinutes: 0 },
            { dayOfWeek: 2, openHour: 9, openMinutes: 0, closeHour: 17, closeMinutes: 0 },
        ];

        const slot = findNextAvailableSlotDetails(MONDAY_10H_UTC, UTC, workingHours);

        expect(slot?.daysUntilOpen).toBe(1);
        expect(slot?.dayOfWeek).toBe(2);
    });
});

describe('toCamelCaseWorkingHours', () => {
    it('đổi khóa snake_case của API sang camelCase mà helper dùng', () => {
        expect(
            toCamelCaseWorkingHours([
                { day_of_week: 3, open_hour: 8, open_minutes: 30, close_hour: 18, close_minutes: 0 },
            ]),
        ).toStrictEqual([
            {
                dayOfWeek: 3,
                openHour: 8,
                openMinutes: 30,
                closeHour: 18,
                closeMinutes: 0,
                closedAllDay: undefined,
                openAllDay: undefined,
            },
        ]);
    });
});

describe('formatClockTime', () => {
    it('tiếng Việt dùng giờ 24, tiếng Anh dùng AM/PM', () => {
        expect(formatClockTime(8, 0, 'vi')).toBe('8:00');
        expect(formatClockTime(22, 5, 'vi')).toBe('22:05');
        expect(formatClockTime(13, 0, 'en')).toBe('1:00 PM');
    });
});

describe('giờ đóng của khung mở kế tiếp', () => {
    it('đi kèm giờ mở để widget ghi được khung trực, kể cả khung vắt qua nửa đêm', () => {
        const workingHours = [{ dayOfWeek: 2, openHour: 22, openMinutes: 0, closeHour: 2, closeMinutes: 30 }];
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const slot = findNextAvailableSlotDetails(MONDAY_10H_UTC, timeZone, workingHours);

        expect(slot?.config.openHour).toBe(22);
        expect(slot?.config.closeHour).toBe(2);
        expect(slot?.config.closeMinutes).toBe(30);
    });

    it('quy giờ đóng sang múi giờ của khách cùng với giờ mở', () => {
        const workingHours = [{ dayOfWeek: 2, openHour: 8, openMinutes: 0, closeHour: 17, closeMinutes: 0 }];
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const inboxZone = timeZone === 'Asia/Tokyo' ? 'Asia/Ho_Chi_Minh' : 'Asia/Tokyo';

        const slot = findNextAvailableSlotDetails(MONDAY_10H_UTC, inboxZone, workingHours);
        const lengthHours = ((slot!.config.closeHour! - slot!.config.openHour! + 24) % 24);

        expect(lengthHours).toBe(9);
    });
});
