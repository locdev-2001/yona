import { chunk } from 'shared/helpers/array';
import {
    addDays,
    addMonths,
    addWeeks,
    addYears,
    eachDayOfInterval,
    endOfDay,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isWithinInterval,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subDays,
    subMonths,
    subYears,
} from 'date-fns';

// Port từ dashboard/components/ui/DatePicker/helpers/DatePickerHelper.js.

export const calendarWeeks = [
    { id: 1, label: 'M' },
    { id: 2, label: 'T' },
    { id: 3, label: 'W' },
    { id: 4, label: 'T' },
    { id: 5, label: 'F' },
    { id: 6, label: 'S' },
    { id: 7, label: 'S' },
];

export interface DateRangeOption {
    label: string;
    value: string;
    separator?: boolean;
}

export const dateRanges: DateRangeOption[] = [
    { label: 'DATE_PICKER.DATE_RANGE_OPTIONS.LAST_7_DAYS', value: 'last7days' },
    { label: 'DATE_PICKER.DATE_RANGE_OPTIONS.LAST_30_DAYS', value: 'last30days' },
    { label: 'DATE_PICKER.DATE_RANGE_OPTIONS.LAST_3_MONTHS', value: 'last3months', separator: true },
    { label: 'DATE_PICKER.DATE_RANGE_OPTIONS.LAST_6_MONTHS', value: 'last6months' },
    { label: 'DATE_PICKER.DATE_RANGE_OPTIONS.LAST_YEAR', value: 'lastYear' },
    { label: 'DATE_PICKER.DATE_RANGE_OPTIONS.THIS_WEEK', value: 'thisWeek', separator: true },
    { label: 'DATE_PICKER.DATE_RANGE_OPTIONS.MONTH_TO_DATE', value: 'monthToDate' },
    { label: 'DATE_PICKER.DATE_RANGE_OPTIONS.CUSTOM_RANGE', value: 'custom', separator: true },
];

export const DATE_RANGE_TYPES = {
    LAST_7_DAYS: 'last7days',
    LAST_30_DAYS: 'last30days',
    LAST_3_MONTHS: 'last3months',
    LAST_6_MONTHS: 'last6months',
    LAST_YEAR: 'lastYear',
    THIS_WEEK: 'thisWeek',
    MONTH_TO_DATE: 'monthToDate',
    CUSTOM_RANGE: 'custom',
} as const;

export const CALENDAR_TYPES = { START_CALENDAR: 'start', END_CALENDAR: 'end' } as const;
export const CALENDAR_PERIODS = { WEEK: 'week', MONTH: 'month', YEAR: 'year' } as const;

export type CalendarType = (typeof CALENDAR_TYPES)[keyof typeof CALENDAR_TYPES];
export type CalendarPeriod = (typeof CALENDAR_PERIODS)[keyof typeof CALENDAR_PERIODS];

export const monthName = (currentDate: Date): string => format(currentDate, 'MMMM');
export const yearName = (currentDate: Date): string => format(currentDate, 'yyyy');

export function getIntlDateFormatForLocale(): string {
    const year = 2222;
    const month = 12;
    const day = 15;
    const date = new Date(year, month - 1, day);
    const formattedDate = new Intl.DateTimeFormat(navigator.language).format(date);
    return formattedDate.replace(`${year}`, 'yyyy').replace(`${month}`, 'MM').replace(`${day}`, 'dd');
}

export function getWeeksForMonth(date: Date, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): Date[][] {
    const startOfTheMonth = startOfMonth(date);
    const startOfTheFirstWeek = startOfWeek(startOfTheMonth, { weekStartsOn });
    const endOfTheLastWeek = addDays(startOfTheFirstWeek, 41);
    return chunk(eachDayOfInterval({ start: startOfTheFirstWeek, end: endOfTheLastWeek }), 7);
}

export function moveCalendarDate(
    calendar: CalendarType,
    startCurrentDate: Date,
    endCurrentDate: Date,
    direction: 'prev' | 'next',
    period: 'month' | 'year',
): { start: Date; end: Date } {
    const adjustFunctions = {
        month: { prev: subMonths, next: addMonths },
        year: { prev: subYears, next: addYears },
    };

    const adjust = adjustFunctions[period][direction];

    if (calendar === 'start') {
        return { start: adjust(startCurrentDate, 1), end: endCurrentDate };
    }
    return { start: startCurrentDate, end: adjust(endCurrentDate, 1) };
}

export const isToday = (currentDate: Date, date: Date): boolean =>
    date.getDate() === currentDate.getDate() &&
    date.getMonth() === currentDate.getMonth() &&
    date.getFullYear() === currentDate.getFullYear();

export const isCurrentMonth = (day: Date, referenceDate: Date): boolean => isSameMonth(day, referenceDate);

export function isLastDayOfMonth(day: Date): boolean {
    return day.getDate() === endOfMonth(day).getDate();
}

export function dayIsInRange(date: Date, startDate?: Date | null, endDate?: Date | null): boolean {
    if (!startDate || !endDate) return false;

    let startOfDayStart = startOfDay(startDate);
    let startOfDayEnd = startOfDay(endDate);
    if (startOfDayStart > startOfDayEnd) {
        [startOfDayStart, startOfDayEnd] = [startOfDayEnd, startOfDayStart];
    }
    return (
        isSameDay(date, startOfDayStart) || isWithinInterval(date, { start: startOfDayStart, end: startOfDayEnd })
    );
}

export function isHoveringDayInRange(
    day: Date,
    startDate?: Date | null,
    endDate?: Date | boolean | null,
    hoveredEndDate?: Date | null,
): boolean {
    if (endDate && hoveredEndDate && startDate && startDate <= hoveredEndDate) {
        return isWithinInterval(day, { start: startDate, end: hoveredEndDate });
    }
    return false;
}

export function isHoveringNextDayInRange(
    day: Date,
    startDate?: Date | null,
    endDate?: Date | null,
    hoveredEndDate?: Date | null,
): boolean {
    if (startDate && !endDate && hoveredEndDate) {
        return isWithinInterval(addDays(day, 1), { start: startDate, end: hoveredEndDate });
    }
    if (startDate && endDate) {
        return isWithinInterval(addDays(day, 1), { start: startDate, end: endDate });
    }
    return false;
}

export function getActiveDateRange(range: string, currentDate: Date): { start: Date; end: Date } {
    const ranges: Record<string, () => { start: Date; end: Date }> = {
        last7days: () => ({ start: startOfDay(subDays(currentDate, 6)), end: endOfDay(currentDate) }),
        last30days: () => ({ start: startOfDay(subDays(currentDate, 29)), end: endOfDay(currentDate) }),
        last3months: () => ({ start: startOfDay(subMonths(currentDate, 3)), end: endOfDay(currentDate) }),
        last6months: () => ({ start: startOfDay(subMonths(currentDate, 6)), end: endOfDay(currentDate) }),
        lastYear: () => ({ start: startOfDay(subMonths(currentDate, 12)), end: endOfDay(currentDate) }),
        thisWeek: () => ({
            start: startOfDay(startOfWeek(currentDate, { weekStartsOn: 1 })),
            end: endOfDay(currentDate),
        }),
        monthToDate: () => ({ start: startOfDay(startOfMonth(currentDate)), end: endOfDay(currentDate) }),
        custom: () => ({ start: currentDate, end: currentDate }),
    };

    return (ranges[range] || (() => ({ start: currentDate, end: currentDate })))();
}

export const isNavigableRange = (rangeType: string): boolean =>
    rangeType === DATE_RANGE_TYPES.MONTH_TO_DATE || rangeType === DATE_RANGE_TYPES.THIS_WEEK;

const WEEK_START = 1;

function getWeekRangeAtOffset(offset: number, currentDate: Date): { start: Date; end: Date } {
    if (offset === 0) {
        return {
            start: startOfDay(startOfWeek(currentDate, { weekStartsOn: WEEK_START })),
            end: endOfDay(currentDate),
        };
    }
    const targetWeek = addWeeks(currentDate, offset);
    return {
        start: startOfDay(startOfWeek(targetWeek, { weekStartsOn: WEEK_START })),
        end: endOfDay(endOfWeek(targetWeek, { weekStartsOn: WEEK_START })),
    };
}

function getMonthRangeAtOffset(offset: number, currentDate: Date): { start: Date; end: Date } {
    if (offset === 0) {
        return { start: startOfDay(startOfMonth(currentDate)), end: endOfDay(currentDate) };
    }
    const targetMonth = addMonths(currentDate, offset);
    return { start: startOfDay(startOfMonth(targetMonth)), end: endOfDay(endOfMonth(targetMonth)) };
}

export function getRangeAtOffset(
    rangeType: string,
    offset: number,
    currentDate: Date = new Date(),
): { start: Date; end: Date } {
    if (rangeType === DATE_RANGE_TYPES.THIS_WEEK) return getWeekRangeAtOffset(offset, currentDate);
    return getMonthRangeAtOffset(offset, currentDate);
}
