import type { WorkingHour, WorkingHourSlot } from '../types';

// Port từ widget/helpers/availabilityHelpers.js. Khác một chỗ có chủ đích:
// bản gốc dùng `utcToZonedTime` của date-fns-tz; ở đây quy đổi bằng Intl (offset
// `+07:00` hoặc tên IANA đều nhận) để không thêm phụ thuộc mới.

const DAYS_IN_WEEK = 7;
const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = 24 * 60;
const OFFSET_PATTERN = /^([+-])(\d{2}):?(\d{2})$/;

export interface NextSlotDetails {
    config: WorkingHour;
    minutesUntilOpen: number;
    daysUntilOpen: number;
    dayOfWeek: number;
}

export const toCamelCaseWorkingHours = (slots: WorkingHourSlot[] = []): WorkingHour[] =>
    slots.map(slot => ({
        dayOfWeek: slot.day_of_week,
        closedAllDay: slot.closed_all_day,
        openAllDay: slot.open_all_day,
        openHour: slot.open_hour,
        openMinutes: slot.open_minutes,
        closeHour: slot.close_hour,
        closeMinutes: slot.close_minutes,
    }));

const getUserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

// Trả về Date "giả" mang các trường ngày/giờ của múi giờ đích (đúng ý utcToZonedTime).
export const getDateInTimezone = (time: Date | string, utcOffset: string): Date => {
    const date = time instanceof Date ? time : new Date(time);

    const offsetMatch = OFFSET_PATTERN.exec(utcOffset ?? '');
    if (offsetMatch) {
        const [, sign, hours, minutes] = offsetMatch;
        const offsetMinutes = (Number(hours) * MINUTES_IN_HOUR + Number(minutes)) * (sign === '-' ? -1 : 1);
        return new Date(date.getTime() + (offsetMinutes + date.getTimezoneOffset()) * 60000);
    }

    const timeZone = utcOffset || getUserTimezone();
    try {
        return new Date(date.toLocaleString('en-US', { timeZone }));
    } catch {
        return new Date(date.toLocaleString('en-US', { timeZone: getUserTimezone() }));
    }
};

const toMinutes = (hours = 0, minutes = 0) => hours * MINUTES_IN_HOUR + minutes;

const getTodayConfig = (time: Date | string, utcOffset: string, workingHours: WorkingHour[]): WorkingHour | null => {
    const dayOfWeek = getDateInTimezone(time, utcOffset).getDay();
    return workingHours.find(slot => slot.dayOfWeek === dayOfWeek) || null;
};

const isTimeWithinRange = (currentMinutes: number, openMinutes: number, closeMinutes: number) => {
    const crossesMidnight = closeMinutes <= openMinutes;
    return crossesMidnight
        ? currentMinutes >= openMinutes || currentMinutes < closeMinutes
        : currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};

const getOpenDaysMap = (workingHours: WorkingHour[]) =>
    new Map((workingHours || []).filter(slot => !slot.closedAllDay).map(slot => [slot.dayOfWeek, slot]));

const checkTodayAvailability = (
    currentDay: number,
    currentMinutes: number,
    openDays: Map<number, WorkingHour>,
): NextSlotDetails | null => {
    const todayConfig = openDays.get(currentDay);
    if (!todayConfig || todayConfig.openAllDay) return null;

    const todayOpenMinutes = toMinutes(todayConfig.openHour ?? 0, todayConfig.openMinutes ?? 0);
    if (currentMinutes < todayOpenMinutes) {
        return {
            config: todayConfig,
            minutesUntilOpen: todayOpenMinutes - currentMinutes,
            daysUntilOpen: 0,
            dayOfWeek: currentDay,
        };
    }
    return null;
};

const findNextSlot = (
    currentDay: number,
    currentMinutes: number,
    openDays: Map<number, WorkingHour>,
): NextSlotDetails | null =>
    Array.from({ length: DAYS_IN_WEEK }, (_, index) => index + 1)
        .map(daysAhead => {
            const targetDay = (currentDay + daysAhead) % DAYS_IN_WEEK;
            const config = openDays.get(targetDay);
            if (!config) return null;

            const slotOpenMinutes = config.openAllDay ? 0 : toMinutes(config.openHour ?? 0, config.openMinutes ?? 0);
            const minutesUntilOpen =
                MINUTES_IN_DAY - currentMinutes + (daysAhead - 1) * MINUTES_IN_DAY + slotOpenMinutes;

            return { config, minutesUntilOpen, daysUntilOpen: daysAhead, dayOfWeek: targetDay };
        })
        .find(Boolean) || null;

const convertSlotToUserTimezone = (
    time: Date | string,
    inboxTz: string,
    slotDetails: NextSlotDetails | null,
): NextSlotDetails | null => {
    if (!slotDetails) return null;

    const userTz = getUserTimezone();
    if (inboxTz === userTz) return slotDetails;

    const now = time instanceof Date ? time : new Date(time);
    const openingTime = new Date(now.getTime() + slotDetails.minutesUntilOpen * 60000);

    const openingInUserTz = getDateInTimezone(openingTime, userTz);
    const nowInUserTz = getDateInTimezone(now, userTz);

    const openingDate = new Date(openingInUserTz);
    openingDate.setHours(0, 0, 0, 0);
    const todayDate = new Date(nowInUserTz);
    todayDate.setHours(0, 0, 0, 0);
    const daysUntilOpen = Math.round((openingDate.getTime() - todayDate.getTime()) / 86400000);

    return {
        ...slotDetails,
        config: {
            ...slotDetails.config,
            openHour: openingInUserTz.getHours(),
            openMinutes: openingInUserTz.getMinutes(),
            dayOfWeek: openingInUserTz.getDay(),
        },
        daysUntilOpen,
        dayOfWeek: openingInUserTz.getDay(),
    };
};

export const isInWorkingHours = (time: Date | string, utcOffset: string, workingHours: WorkingHour[] = []): boolean => {
    if (!workingHours.length) return false;

    const todayConfig = getTodayConfig(time, utcOffset, workingHours);
    if (!todayConfig) return false;
    if (todayConfig.openAllDay) return true;
    if (todayConfig.closedAllDay) return false;

    const date = getDateInTimezone(time, utcOffset);
    const currentMinutes = toMinutes(date.getHours(), date.getMinutes());
    const openMinutes = toMinutes(todayConfig.openHour ?? 0, todayConfig.openMinutes ?? 0);
    const closeMinutes = toMinutes(todayConfig.closeHour ?? 0, todayConfig.closeMinutes ?? 0);

    return isTimeWithinRange(currentMinutes, openMinutes, closeMinutes);
};

export const findNextAvailableSlotDetails = (
    time: Date | string,
    utcOffset: string,
    workingHours: WorkingHour[] = [],
): NextSlotDetails | null => {
    const date = getDateInTimezone(time, utcOffset);
    const currentDay = date.getDay();
    const currentMinutes = toMinutes(date.getHours(), date.getMinutes());

    const openDays = getOpenDaysMap(workingHours);
    if (openDays.size === 0) return null;

    const todaySlot = checkTodayAvailability(currentDay, currentMinutes, openDays);
    const slotDetails = todaySlot || findNextSlot(currentDay, currentMinutes, openDays);

    return convertSlotToUserTimezone(time, utcOffset, slotDetails);
};

export const isOnline = (
    workingHoursEnabled: boolean,
    time: Date | string,
    utcOffset: string,
    workingHours: WorkingHour[],
    hasOnlineAgents: boolean,
): boolean => {
    if (!workingHoursEnabled) return hasOnlineAgents;
    return isInWorkingHours(time, utcOffset, workingHours) && hasOnlineAgents;
};

// dashboard/routes/dashboard/settings/inbox/helpers/businessHour.js#getTime
export const getTime = (hours: number, minutes: number): string => {
    const period = hours >= 12 ? 'PM' : 'AM';
    const hoursIn12HourFormat = hours % 12 || 12;
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${hoursIn12HourFormat}:${paddedMinutes} ${period}`;
};
