import { useEffect, useRef, useState } from 'react';
import {
    addMonths,
    differenceInCalendarMonths,
    differenceInCalendarWeeks,
    endOfDay,
    getWeek,
    isSameMonth,
    isValid,
    setMonth,
    setYear,
    startOfDay,
    startOfMonth,
    subDays,
    subMonths,
} from 'date-fns';

import { useAlert } from 'dashboard/composables/useAlert';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { t } from '../../../../i18n';
import CalendarDateInput from './components/CalendarDateInput';
import CalendarDateRange from './components/CalendarDateRange';
import CalendarFooter from './components/CalendarFooter';
import CalendarMonth from './components/CalendarMonth';
import CalendarWeek from './components/CalendarWeek';
import CalendarYear from './components/CalendarYear';
import DatePickerButton from './components/DatePickerButton';
import {
    CALENDAR_PERIODS,
    CALENDAR_TYPES,
    DATE_RANGE_TYPES,
    getActiveDateRange,
    getRangeAtOffset,
    isNavigableRange,
    moveCalendarDate,
    type CalendarPeriod,
    type CalendarType,
    type DateRangeOption,
} from './helpers/datePickerHelper';

// Port từ dashboard/components/ui/DatePicker/DatePicker.vue — v-model dateRange /
// rangeType đổi thành cặp prop + callback onDateRangeChanged.

const { LAST_7_DAYS, CUSTOM_RANGE } = DATE_RANGE_TYPES;
const { START_CALENDAR, END_CALENDAR } = CALENDAR_TYPES;
const { WEEK, MONTH, YEAR } = CALENDAR_PERIODS;

export interface DatePickerProps {
    dateRange?: [Date, Date];
    rangeType?: string;
    hasAppliedRange?: boolean;
    onDateRangeChanged: (value: [Date, Date, string]) => void;
    onClose?: () => void;
}

export default function DatePicker({
    dateRange,
    rangeType,
    hasAppliedRange = true,
    onDateRangeChanged,
    onClose,
}: DatePickerProps) {
    const currentDate = useRef(new Date()).current;
    const rootRef = useRef<HTMLDivElement>(null);

    const [showDatePicker, setShowDatePicker] = useState(!hasAppliedRange);
    const [calendarViews, setCalendarViews] = useState<Record<CalendarType, CalendarPeriod>>({
        start: WEEK,
        end: WEEK,
    });
    const [selectedStartDate, setSelectedStartDate] = useState<Date>(() =>
        dateRange?.[0] ? startOfDay(dateRange[0]) : startOfDay(subDays(currentDate, 6)),
    );
    const [selectedEndDate, setSelectedEndDate] = useState<Date | null>(() =>
        dateRange?.[1] ? endOfDay(dateRange[1]) : endOfDay(currentDate),
    );
    const [startCurrentDate, setStartCurrentDate] = useState<Date>(() => startOfMonth(selectedStartDate));
    const [endCurrentDate, setEndCurrentDate] = useState<Date>(() =>
        isSameMonth(selectedStartDate, selectedEndDate as Date)
            ? startOfMonth(addMonths(selectedEndDate as Date, 1))
            : startOfMonth(selectedEndDate as Date),
    );
    const [selectingEndDate, setSelectingEndDate] = useState(false);
    const [selectedRange, setSelectedRange] = useState<string>(rangeType || LAST_7_DAYS);
    const [hoveredEndDate, setHoveredEndDate] = useState<Date | null>(null);
    const monthOffset = useRef(0);

    const [manualStartDate, setManualStartDate] = useState<Date>(selectedStartDate);
    const [manualEndDate, setManualEndDate] = useState<Date>(selectedEndDate as Date);

    // Watcher 1 của bản gốc: đồng bộ prop từ cha (URL params, đổi rangeType).
    const rangeStamp = dateRange ? `${dateRange[0]?.getTime()}-${dateRange[1]?.getTime()}` : '';
    useEffect(() => {
        let nextStart: Date | null = null;
        let nextEnd: Date | null = null;

        if (rangeType && rangeType !== selectedRange) {
            setSelectedRange(rangeType);
            monthOffset.current = 0;

            if (!dateRange && rangeType !== CUSTOM_RANGE) {
                const activeDates = getActiveDateRange(rangeType, currentDate);
                if (activeDates) {
                    nextStart = startOfDay(activeDates.start);
                    nextEnd = endOfDay(activeDates.end);
                }
            }
        }

        if (dateRange?.[0] && dateRange?.[1] && monthOffset.current === 0) {
            nextStart = startOfDay(dateRange[0]);
            nextEnd = endOfDay(dateRange[1]);

            setStartCurrentDate(startOfMonth(dateRange[0]));
            setEndCurrentDate(
                isSameMonth(dateRange[0], dateRange[1])
                    ? startOfMonth(addMonths(dateRange[1], 1))
                    : startOfMonth(dateRange[1]),
            );

            const activeRangeType = rangeType || selectedRange;
            if (isNavigableRange(activeRangeType)) {
                const current = getActiveDateRange(activeRangeType, currentDate);
                monthOffset.current =
                    activeRangeType === DATE_RANGE_TYPES.THIS_WEEK
                        ? differenceInCalendarWeeks(dateRange[0], current.start, { weekStartsOn: 1 })
                        : differenceInCalendarMonths(dateRange[0], current.start);
            }
        }

        if (nextStart) setSelectedStartDate(nextStart);
        if (nextEnd) setSelectedEndDate(nextEnd);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rangeType, rangeStamp]);

    // Watcher 2: giữ ô nhập tay khớp ngày đang chọn.
    useEffect(() => {
        if (isValid(selectedStartDate)) setManualStartDate(selectedStartDate);
        if (selectedEndDate && isValid(selectedEndDate)) setManualEndDate(selectedEndDate);
    }, [selectedStartDate, selectedEndDate]);

    const showMonthNavigation = isNavigableRange(selectedRange);
    const canNavigateNext =
        isNavigableRange(selectedRange) && selectedStartDate < getActiveDateRange(selectedRange, currentDate).start;

    const navigationLabel = (() => {
        if (selectedRange === DATE_RANGE_TYPES.MONTH_TO_DATE) {
            return new Intl.DateTimeFormat(navigator.language, { month: 'long' }).format(selectedStartDate);
        }
        if (selectedRange === DATE_RANGE_TYPES.THIS_WEEK) {
            const currentWeekRange = getActiveDateRange(selectedRange, currentDate);
            if (selectedStartDate.getTime() === currentWeekRange.start.getTime()) return null;
            return t('DATE_PICKER.WEEK_NUMBER', { weekNumber: getWeek(selectedStartDate, { weekStartsOn: 1 }) });
        }
        return null;
    })();

    const positionCalendars = (start: Date, end: Date) => {
        setStartCurrentDate(startOfMonth(start));
        setEndCurrentDate(isSameMonth(start, end) ? startOfMonth(addMonths(start, 1)) : startOfMonth(end));
    };

    const setDateRange = (range: DateRangeOption) => {
        setSelectedRange(range.value);
        monthOffset.current = 0;
        const { start, end } = getActiveDateRange(range.value, currentDate);
        setSelectedStartDate(start);
        setSelectedEndDate(end);
        positionCalendars(start, end);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        monthOffset.current += direction === 'prev' ? -1 : 1;
        if (monthOffset.current > 0) monthOffset.current = 0;

        const { start, end } = getRangeAtOffset(selectedRange, monthOffset.current, currentDate);
        setSelectedStartDate(start);
        setSelectedEndDate(end);
        positionCalendars(start, end);

        onDateRangeChanged([start, end, selectedRange]);
    };

    const moveCalendar = (calendar: CalendarType, direction: 'prev' | 'next', period: 'month' | 'year' = MONTH) => {
        const { start, end } = moveCalendarDate(calendar, startCurrentDate, endCurrentDate, direction, period);

        if (differenceInCalendarMonths(end, start) === 0) {
            if (calendar === START_CALENDAR) {
                setEndCurrentDate(addMonths(start, 1));
                setStartCurrentDate(start);
            } else {
                setStartCurrentDate(subMonths(end, 1));
                setEndCurrentDate(end);
            }
        } else {
            setStartCurrentDate(start);
            setEndCurrentDate(end);
        }
    };

    const selectDate = (day: Date) => {
        setSelectedRange(CUSTOM_RANGE);
        monthOffset.current = 0;
        if (!selectingEndDate || day < selectedStartDate) {
            setSelectedStartDate(day);
            setSelectedEndDate(null);
            setSelectingEndDate(true);
        } else {
            setSelectedEndDate(day);
            setSelectingEndDate(false);
        }
    };

    const setViewMode = (calendar: CalendarType, mode: CalendarPeriod) => {
        setSelectedRange(CUSTOM_RANGE);
        setCalendarViews(current => ({ ...current, [calendar]: mode }));
    };

    const openCalendar = (index: number, calendarType: CalendarType, period: 'month' | 'year' = MONTH) => {
        const current = calendarType === START_CALENDAR ? startCurrentDate : endCurrentDate;
        const newDate = period === MONTH ? setMonth(startOfMonth(current), index) : setYear(current, index);
        if (calendarType === START_CALENDAR) setStartCurrentDate(newDate);
        else setEndCurrentDate(newDate);
        setViewMode(calendarType, period === MONTH ? WEEK : MONTH);
    };

    const updateManualInput = (newDate: Date, calendarType: CalendarType) => {
        if (calendarType === START_CALENDAR) {
            setSelectedStartDate(newDate);
            setStartCurrentDate(startOfMonth(newDate));
        } else {
            setSelectedEndDate(newDate);
            setEndCurrentDate(startOfMonth(newDate));
        }
        setSelectingEndDate(false);
    };

    const resetDatePicker = () => {
        const startDate = startOfDay(subDays(currentDate, 6));
        const endDate = endOfDay(currentDate);

        setSelectedStartDate(startDate);
        setSelectedEndDate(endDate);
        positionCalendars(startDate, endDate);
        setSelectingEndDate(false);
        setSelectedRange(LAST_7_DAYS);
        monthOffset.current = 0;
        setCalendarViews({ start: WEEK, end: WEEK });
    };

    const emitDateRange = () => {
        if (!isValid(selectedStartDate) || !selectedEndDate || !isValid(selectedEndDate)) {
            useAlert('Please select a valid time range');
            return;
        }
        setShowDatePicker(false);
        onDateRangeChanged([selectedStartDate, selectedEndDate, selectedRange]);
    };

    const toggleDatePicker = () => {
        if (showDatePicker) {
            setShowDatePicker(false);
            onClose?.();
            return;
        }
        if (selectedStartDate && selectedEndDate) positionCalendars(selectedStartDate, selectedEndDate);
        setShowDatePicker(true);
    };

    const closeDatePicker = () => {
        if (hasAppliedRange && isValid(selectedStartDate) && selectedEndDate && isValid(selectedEndDate)) {
            emitDateRange();
            return;
        }
        setShowDatePicker(false);
        onClose?.();
    };

    useClickAway(rootRef, closeDatePicker, showDatePicker);

    return (
        <div ref={rootRef} className="relative flex-shrink-0 font-inter">
            <DatePickerButton
                selectedStartDate={selectedStartDate}
                selectedEndDate={selectedEndDate}
                selectedRange={selectedRange}
                showMonthNavigation={showMonthNavigation}
                canNavigateNext={canNavigateNext}
                navigationLabel={navigationLabel}
                onOpen={toggleDatePicker}
                onNavigateMonth={navigateMonth}
            />
            {showDatePicker && (
                <div className="flex absolute top-9 ltr:left-0 rtl:right-0 z-30 shadow-md select-none w-[880px] rounded-2xl bg-n-alpha-3 backdrop-blur-[100px] border-0 outline outline-1 outline-n-container">
                    <CalendarDateRange selectedRange={selectedRange} onSetRange={setDateRange} />
                    <div className="flex flex-col w-[680px] ltr:border-l rtl:border-r border-n-strong">
                        <div className="flex justify-around h-fit">
                            {([START_CALENDAR, END_CALENDAR] as CalendarType[]).map(calendar => (
                                <div key={`${calendar}-calendar`} className="flex flex-col items-center">
                                    <CalendarDateInput
                                        calendarType={calendar}
                                        dateValue={calendar === START_CALENDAR ? manualStartDate : manualEndDate}
                                        compareDate={calendar === START_CALENDAR ? manualEndDate : manualStartDate}
                                        isDisabled={selectedRange !== CUSTOM_RANGE}
                                        onUpdate={date =>
                                            calendar === START_CALENDAR ? setManualStartDate(date) : setManualEndDate(date)
                                        }
                                        onValidate={date => updateManualInput(date, calendar)}
                                        onError={message => useAlert(message)}
                                    />
                                    <div className="py-5 border-b border-n-strong">
                                        <div
                                            className={`flex flex-col items-center gap-2 px-5 min-w-[340px] max-h-[352px] ${
                                                calendar === START_CALENDAR ? 'ltr:border-r rtl:border-l border-n-strong' : ''
                                            }`}
                                        >
                                            {calendarViews[calendar] === YEAR && (
                                                <CalendarYear
                                                    calendarType={calendar}
                                                    startCurrentDate={startCurrentDate}
                                                    endCurrentDate={endCurrentDate}
                                                    onSelectYear={year => openCalendar(year, calendar, YEAR)}
                                                />
                                            )}
                                            {calendarViews[calendar] === MONTH && (
                                                <CalendarMonth
                                                    calendarType={calendar}
                                                    startCurrentDate={startCurrentDate}
                                                    endCurrentDate={endCurrentDate}
                                                    onSelectMonth={index => openCalendar(index, calendar)}
                                                    onSetView={setViewMode}
                                                    onPrev={() => moveCalendar(calendar, 'prev', YEAR)}
                                                    onNext={() => moveCalendar(calendar, 'next', YEAR)}
                                                />
                                            )}
                                            {calendarViews[calendar] === WEEK && (
                                                <CalendarWeek
                                                    calendarType={calendar}
                                                    currentDate={currentDate}
                                                    startCurrentDate={startCurrentDate}
                                                    endCurrentDate={endCurrentDate}
                                                    selectedStartDate={selectedStartDate}
                                                    selectedEndDate={selectedEndDate}
                                                    selectingEndDate={selectingEndDate}
                                                    hoveredEndDate={hoveredEndDate}
                                                    onUpdateHoveredEndDate={setHoveredEndDate}
                                                    onSelectDate={selectDate}
                                                    onSetView={setViewMode}
                                                    onPrev={() => moveCalendar(calendar, 'prev')}
                                                    onNext={() => moveCalendar(calendar, 'next')}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <CalendarFooter onChange={emitDateRange} onClear={resetDatePicker} />
                    </div>
                </div>
            )}
        </div>
    );
}
