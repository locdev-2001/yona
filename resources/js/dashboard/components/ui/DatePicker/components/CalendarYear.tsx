import { useState } from 'react';
import { addYears, getYear, subYears } from 'date-fns';

import { CALENDAR_TYPES, type CalendarType } from '../helpers/datePickerHelper';
import CalendarAction from './CalendarAction';

// Port từ DatePicker/components/CalendarYear.vue
interface CalendarYearProps {
    calendarType?: CalendarType;
    startCurrentDate: Date;
    endCurrentDate: Date;
    onSelectYear: (year: number) => void;
}

const calculateStartYear = (date: Date) => {
    const year = getYear(date);
    return year - (year % 10);
};

export default function CalendarYear({
    calendarType = 'start',
    startCurrentDate,
    endCurrentDate,
    onSelectYear,
}: CalendarYearProps) {
    const referenceDate = calendarType === CALENDAR_TYPES.START_CALENDAR ? startCurrentDate : endCurrentDate;
    const [startYear, setStartYear] = useState(() => calculateStartYear(referenceDate));

    const years = Array.from({ length: 10 }, (_, index) => startYear + index);
    const activeYear = getYear(referenceDate);

    return (
        <div className="flex flex-col w-full gap-2 max-h-[312px]">
            <CalendarAction
                calendarType={calendarType}
                buttonLabel={`${years[0]} - ${years[years.length - 1]}`}
                onPrev={() => setStartYear(current => subYears(new Date(current, 0, 1), 10).getFullYear())}
                onNext={() => setStartYear(current => addYears(new Date(current, 0, 1), 10).getFullYear())}
                onSetView={() => undefined}
            />

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 w-full auto-rows-[47px]">
                {years.map(year => (
                    <button
                        key={year}
                        type="button"
                        className={`p-2 text-sm font-medium text-center text-n-slate-12 w-[144px] h-10 rounded-lg py-2.5 px-2 ${
                            year === activeYear
                                ? 'bg-n-brand text-white hover:bg-n-blue-10'
                                : 'hover:bg-n-alpha-2'
                        }`}
                        onClick={event => {
                            event.stopPropagation();
                            onSelectYear(year);
                        }}
                    >
                        {year}
                    </button>
                ))}
            </div>
        </div>
    );
}
