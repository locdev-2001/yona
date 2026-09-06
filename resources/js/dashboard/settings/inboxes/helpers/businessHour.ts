import { getHours, getMinutes, parse } from 'date-fns';

import timeZoneData from './timezones.json';

// Port từ settings/inbox/helpers/businessHour.js.

// Hình dạng một dòng lịch trong payload API (`working_hours` của inbox).
export interface WorkingHourPayload {
    day_of_week: number;
    closed_all_day: boolean;
    open_hour: number | string | null;
    open_minutes: number | string | null;
    close_hour: number | string | null;
    close_minutes: number | string | null;
    open_all_day: boolean;
}

// Hình dạng dùng trong form: giờ ở dạng chuỗi 12h người đọc được.
export interface TimeSlot {
    day: number;
    from: string;
    to: string;
    valid: boolean;
    openAllDay?: boolean;
}

export interface TimeZoneOption {
    label: string;
    value: string;
}

export const defaultTimeSlot: TimeSlot[] = [0, 1, 2, 3, 4, 5, 6].map(day => ({
    day,
    to: '',
    from: '',
    valid: false,
}));

/**
 * Danh sách mốc giờ từ 12:00 AM tới hết ngày, cách nhau `step` phút.
 * Luôn kèm 11:59 PM để đóng ngày.
 */
export const generateTimeSlots = (step = 15): string[] => {
    const date = new Date(1970, 1, 1);
    const slots: string[] = [];

    while (date.getDate() === 1) {
        slots.push(
            date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            }),
        );
        date.setMinutes(date.getMinutes() + step);
    }

    const lastSlot = '11:59 PM';
    if (!slots.includes(lastSlot)) slots.push(lastSlot);

    return slots;
};

export const getTime = (hour: number, minute: number): string => {
    const meridian = hour > 11 ? 'PM' : 'AM';
    const modHour = hour > 12 ? hour % 12 : hour || 12;
    const parsedHour = modHour < 10 ? `0${modHour}` : `${modHour}`;
    const parsedMinute = minute < 10 ? `0${minute}` : `${minute}`;

    return `${parsedHour}:${parsedMinute} ${meridian}`;
};

export const timeSlotParse = (timeSlots: WorkingHourPayload[]): TimeSlot[] =>
    timeSlots.map(slot => {
        const closedAllDay = slot.closed_all_day;

        return {
            day: slot.day_of_week,
            to: closedAllDay ? '' : getTime(Number(slot.close_hour), Number(slot.close_minutes)),
            from: closedAllDay ? '' : getTime(Number(slot.open_hour), Number(slot.open_minutes)),
            valid: !closedAllDay,
            openAllDay: slot.open_all_day,
        };
    });

export const timeSlotTransform = (timeSlots: TimeSlot[]): WorkingHourPayload[] =>
    timeSlots.map(slot => {
        const openAllDay = Boolean(slot.openAllDay);
        const closed = openAllDay ? false : !(slot.to && slot.from);

        if (closed) {
            return {
                day_of_week: slot.day,
                closed_all_day: true,
                open_hour: '',
                open_minutes: '',
                close_hour: '',
                close_minutes: '',
                open_all_day: openAllDay,
            };
        }

        const fromDate = parse(slot.from, 'hh:mm a', new Date());
        const toDate = parse(slot.to, 'hh:mm a', new Date());

        return {
            day_of_week: slot.day,
            closed_all_day: false,
            open_hour: getHours(fromDate),
            open_minutes: getMinutes(fromDate),
            close_hour: getHours(toDate),
            close_minutes: getMinutes(toDate),
            open_all_day: openAllDay,
        };
    });

export const timeZoneOptions = (): TimeZoneOption[] =>
    Object.entries(timeZoneData as Record<string, string>).map(([label, value]) => ({ label, value }));
