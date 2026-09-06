import {
    CALENDAR_PERIODS,
    CALENDAR_TYPES,
    dayIsInRange,
    getWeeksForMonth,
    isCurrentMonth,
    isHoveringDayInRange,
    isHoveringNextDayInRange,
    isLastDayOfMonth,
    isToday,
    monthName,
    yearName,
    type CalendarPeriod,
    type CalendarType,
} from '../helpers/datePickerHelper';
import CalendarAction from './CalendarAction';
import CalendarWeekLabel from './CalendarWeekLabel';

// Port từ DatePicker/components/CalendarWeek.vue
interface CalendarWeekProps {
    calendarType?: CalendarType;
    currentDate: Date;
    startCurrentDate: Date;
    endCurrentDate: Date;
    selectedStartDate: Date;
    selectingEndDate: boolean;
    selectedEndDate: Date | null;
    hoveredEndDate: Date | null;
    onUpdateHoveredEndDate: (day: Date | null) => void;
    onSelectDate: (day: Date) => void;
    onPrev: () => void;
    onNext: () => void;
    onSetView: (calendarType: CalendarType, mode: CalendarPeriod) => void;
}

export default function CalendarWeek({
    calendarType = 'start',
    currentDate,
    startCurrentDate,
    endCurrentDate,
    selectedStartDate,
    selectingEndDate,
    selectedEndDate,
    hoveredEndDate,
    onUpdateHoveredEndDate,
    onSelectDate,
    onPrev,
    onNext,
    onSetView,
}: CalendarWeekProps) {
    const referenceDate = calendarType === CALENDAR_TYPES.START_CALENDAR ? startCurrentDate : endCurrentDate;
    const weeks = getWeeksForMonth(referenceDate);

    const isSelectedStartOrEndDate = (day: Date) =>
        dayIsInRange(day, selectedStartDate, selectedStartDate) || dayIsInRange(day, selectedEndDate, selectedEndDate);
    const isInRange = (day: Date) => dayIsInRange(day, selectedStartDate, selectedEndDate);
    const isInCurrentMonth = (day: Date) => isCurrentMonth(day, referenceDate);
    const isHoveringInRange = (day: Date) =>
        isHoveringDayInRange(day, selectedStartDate, selectingEndDate, hoveredEndDate);
    const isNextDayInRange = (day: Date) =>
        isHoveringNextDayInRange(day, selectedStartDate, selectedEndDate, hoveredEndDate);

    const dayClasses = (day: Date) =>
        [
            !isInCurrentMonth(day) ? 'text-n-slate-10 pointer-events-none' : '',
            isInCurrentMonth(day)
                ? 'text-n-slate-12 hover:text-n-slate-12 hover:bg-n-blue-6 dark:hover:bg-n-blue-7'
                : '',
            isSelectedStartOrEndDate(day) && isInCurrentMonth(day) ? 'bg-n-brand text-white' : '',
            (isInRange(day) || isHoveringInRange(day)) && !isSelectedStartOrEndDate(day) && isInCurrentMonth(day)
                ? 'bg-n-blue-4 dark:bg-n-blue-5'
                : '',
            isToday(currentDate, day) && !isSelectedStartOrEndDate(day)
                ? 'outline outline-1 outline-n-blue-8 -outline-offset-1 !text-n-blue-11'
                : '',
        ]
            .filter(Boolean)
            .join(' ');

    return (
        <div className="flex flex-col w-full gap-2 max-h-[312px]">
            <CalendarAction
                viewMode={CALENDAR_PERIODS.MONTH}
                calendarType={calendarType}
                firstButtonLabel={monthName(referenceDate)}
                buttonLabel={yearName(referenceDate)}
                onPrev={onPrev}
                onNext={onNext}
                onSetView={onSetView}
            />
            <CalendarWeekLabel />
            {weeks.map(week => (
                <div
                    key={week[0].getTime()}
                    className="grid max-w-md grid-cols-7 gap-2 mx-auto overflow-hidden rounded-lg"
                >
                    {week.map(day => (
                        <div
                            key={day.getTime()}
                            className={`flex relative items-center justify-center w-9 h-8 py-1.5 px-2 font-medium text-sm rounded-lg cursor-pointer ${dayClasses(day)}`}
                            onMouseEnter={() => onUpdateHoveredEndDate(day)}
                            onMouseLeave={() => onUpdateHoveredEndDate(null)}
                            onClick={() => onSelectDate(day)}
                        >
                            {day.getDate()}
                            {(isInRange(day) || isHoveringInRange(day)) &&
                                isNextDayInRange(day) &&
                                !isLastDayOfMonth(day) &&
                                isInCurrentMonth(day) && (
                                    <span className="absolute bottom-0 w-6 h-8 ltr:-right-4 rtl:-left-4 bg-n-blue-4 dark:bg-n-blue-5 -z-10" />
                                )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
