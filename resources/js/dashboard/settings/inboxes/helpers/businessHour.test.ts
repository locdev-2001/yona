import { describe, expect, it } from 'vitest';

import {
    generateTimeSlots,
    getTime,
    mondayFirst,
    timeSlotLabel,
    timeSlotParse,
    timeSlotTransform,
    timeZoneOptions,
    timeZoneSelection,
} from './businessHour';

// Port từ settings/inbox/helpers/specs/businessHour.spec.js.

describe('generateTimeSlots', () => {
    it('returns 97 slots for 15-minute intervals', () => {
        expect(generateTimeSlots(15)).toHaveLength(97);
    });

    it('returns 49 slots for 30-minute intervals', () => {
        expect(generateTimeSlots(30)).toHaveLength(49);
    });

    it('returns the exact slots for 4-hour intervals', () => {
        expect(generateTimeSlots(240)).toStrictEqual([
            '12:00 AM',
            '04:00 AM',
            '08:00 AM',
            '12:00 PM',
            '04:00 PM',
            '08:00 PM',
            '11:59 PM',
        ]);
    });

    it('always starts at 12:00 AM and ends at 11:59 PM', () => {
        [15, 30, 60].forEach(step => {
            const slots = generateTimeSlots(step);
            expect(slots[0]).toBe('12:00 AM');
            expect(slots[slots.length - 1]).toBe('11:59 PM');
        });
    });

    it('does not duplicate 11:59 PM when the interval already lands on it', () => {
        expect(generateTimeSlots(1).filter(slot => slot === '11:59 PM')).toHaveLength(1);
    });

    it('collapses to the two edges for a 24-hour step', () => {
        expect(generateTimeSlots(1440)).toStrictEqual(['12:00 AM', '11:59 PM']);
    });
});

describe('getTime', () => {
    it('formats an afternoon hour', () => {
        expect(getTime(15, 30)).toBe('03:30 PM');
    });

    it('keeps noon as 12 PM', () => {
        expect(getTime(12, 30)).toBe('12:30 PM');
    });

    it('keeps midnight as 12 AM', () => {
        expect(getTime(0, 0)).toBe('12:00 AM');
    });
});

describe('timeSlotParse', () => {
    it('turns an API row into a form slot', () => {
        expect(
            timeSlotParse([
                {
                    day_of_week: 1,
                    open_hour: 1,
                    open_minutes: 30,
                    close_hour: 4,
                    close_minutes: 30,
                    closed_all_day: false,
                    open_all_day: false,
                },
            ]),
        ).toStrictEqual([{ day: 1, from: '01:30 AM', to: '04:30 AM', valid: true, openAllDay: false }]);
    });

    it('empties the hours of a closed day', () => {
        expect(
            timeSlotParse([
                {
                    day_of_week: 0,
                    open_hour: null,
                    open_minutes: null,
                    close_hour: null,
                    close_minutes: null,
                    closed_all_day: true,
                    open_all_day: false,
                },
            ]),
        ).toStrictEqual([{ day: 0, from: '', to: '', valid: false, openAllDay: false }]);
    });
});

describe('timeSlotTransform', () => {
    it('turns a form slot back into an API row', () => {
        expect(
            timeSlotTransform([{ day: 1, from: '01:30 AM', to: '04:30 AM', valid: true, openAllDay: false }]),
        ).toStrictEqual([
            {
                day_of_week: 1,
                open_hour: 1,
                open_minutes: 30,
                close_hour: 4,
                close_minutes: 30,
                closed_all_day: false,
                open_all_day: false,
            },
        ]);
    });

    it('marks a slot without hours as closed all day', () => {
        expect(timeSlotTransform([{ day: 0, from: '', to: '', valid: false }])).toStrictEqual([
            {
                day_of_week: 0,
                open_hour: '',
                open_minutes: '',
                close_hour: '',
                close_minutes: '',
                closed_all_day: true,
                open_all_day: false,
            },
        ]);
    });

    it('keeps an all-day slot open', () => {
        expect(
            timeSlotTransform([{ day: 2, from: '12:00 AM', to: '11:59 PM', valid: true, openAllDay: true }]),
        ).toStrictEqual([
            {
                day_of_week: 2,
                open_hour: 0,
                open_minutes: 0,
                close_hour: 23,
                close_minutes: 59,
                closed_all_day: false,
                open_all_day: true,
            },
        ]);
    });
});

describe('timeZoneOptions', () => {
    it('keeps the order of the source list', () => {
        expect(timeZoneOptions()[0]).toStrictEqual({
            value: 'Etc/GMT+12',
            label: 'International Date Line West (GMT−12:00)',
        });
    });
});

describe('timeZoneSelection', () => {
    it('khớp múi giờ UTC mà hộp thư cũ lưu với mục Etc/UTC của danh sách', () => {
        expect(timeZoneSelection('UTC').selected).toBe('Etc/UTC');
    });

    it('khớp tên cũ Asia/Saigon với mục giờ Việt Nam', () => {
        expect(timeZoneSelection('Asia/Saigon').selected).toBe('Asia/Ho_Chi_Minh');
    });

    it('có mục giờ Việt Nam cho mặc định của hộp thư mới', () => {
        const { options, selected } = timeZoneSelection('Asia/Ho_Chi_Minh');

        expect(selected).toBe('Asia/Ho_Chi_Minh');
        expect(options.find(option => option.value === 'Asia/Ho_Chi_Minh')?.label).toContain('GMT+07:00');
    });

    it('giữ múi giờ không có trong danh sách thay vì rơi về một múi giờ khác', () => {
        const { options, selected } = timeZoneSelection('Pacific/Kiritimati');

        expect(selected).toBe('Pacific/Kiritimati');
        expect(options[0]).toStrictEqual({ label: 'Pacific/Kiritimati', value: 'Pacific/Kiritimati' });
        expect(options).toHaveLength(timeZoneOptions().length + 1);
    });
});

describe('timeSlotLabel', () => {
    it('hiện mốc giờ theo 24 giờ', () => {
        expect(['12:00 AM', '09:30 AM', '12:00 PM', '05:00 PM', '11:59 PM'].map(timeSlotLabel)).toStrictEqual([
            '00:00',
            '09:30',
            '12:00',
            '17:00',
            '23:59',
        ]);
    });
});

describe('mondayFirst', () => {
    it('xếp thứ hai lên đầu, chủ nhật xuống cuối mà không đổi số ngày', () => {
        const slots = [0, 1, 2, 3, 4, 5, 6].map(day => ({ day, from: '', to: '', valid: false }));

        expect(mondayFirst(slots).map(slot => slot.day)).toStrictEqual([1, 2, 3, 4, 5, 6, 0]);
    });
});
