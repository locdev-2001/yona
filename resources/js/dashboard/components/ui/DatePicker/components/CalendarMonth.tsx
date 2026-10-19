import { format, getMonth, setMonth, startOfMonth } from 'date-fns';

import {
    CALENDAR_PERIODS,
    CALENDAR_TYPES,
    yearName,
    type CalendarPeriod,
    type CalendarType,
} from '../helpers/datePickerHelper';
import CalendarAction from './CalendarAction';

// Port từ DatePicker/components/CalendarMonth.vue
interface CalendarMonthProps {
    calendarType?: CalendarType;
    startCurrentDate: Date;
    endCurrentDate: Date;
    onSelectMonth: (index: number) => void;
    onPrev: () => void;
    onNext: () => void;
    onSetView: (calendarType: CalendarType, mode: CalendarPeriod) => void;
}

const months = Array.from({ length: 12 }, (_, index) => format(setMonth(startOfMonth(new Date()), index), 'MMM'));

export default function CalendarMonth({
    calendarType = 'start',
    startCurrentDate,
    endCurrentDate,
    onSelectMonth,
    onPrev,
    onNext,
    onSetView,
}: CalendarMonthProps) {
    const referenceDate = calendarType === CALENDAR_TYPES.START_CALENDAR ? startCurrentDate : endCurrentDate;
    const activeMonthIndex = getMonth(referenceDate);

    return (
        <div className="flex flex-col w-full gap-2 max-h-[312px]">
            <CalendarAction
                viewMode={CALENDAR_PERIODS.YEAR}
                calendarType={calendarType}
                buttonLabel={yearName(referenceDate)}
                onSetView={onSetView}
                onPrev={onPrev}
                onNext={onNext}
            />

            <div className="grid w-full grid-cols-3 gap-x-3 gap-y-2 auto-rows-[61px]">
                {months.map((month, index) => (
                    <button
                        key={month}
                        type="button"
                        className={`p-2 text-sm font-medium text-center text-n-slate-12 w-[92px] h-10 rounded-lg py-2.5 px-2 ${
                            index === activeMonthIndex
                                ? 'bg-n-brand text-white hover:bg-n-blue-10'
                                : 'hover:bg-n-alpha-2'
                        }`}
                        onClick={event => {
                            event.stopPropagation();
                            onSelectMonth(index);
                        }}
                    >
                        {month}
                    </button>
                ))}
            </div>
        </div>
    );
}
