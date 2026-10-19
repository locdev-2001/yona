import { isAfter, isBefore, isValid, parse } from 'date-fns';

import { CALENDAR_TYPES, getIntlDateFormatForLocale, type CalendarType } from '../helpers/datePickerHelper';
import { t } from '../../../../../i18n';

// Port từ DatePicker/components/CalendarDateInput.vue
interface CalendarDateInputProps {
    calendarType: CalendarType;
    dateValue: Date;
    compareDate?: Date | null;
    isDisabled?: boolean;
    onUpdate: (date: Date) => void;
    onValidate: (date: Date) => void;
    onError: (message: string) => void;
}

export default function CalendarDateInput({
    calendarType,
    dateValue,
    compareDate,
    isDisabled = false,
    onUpdate,
    onValidate,
    onError,
}: CalendarDateInputProps) {
    const dateFormat = getIntlDateFormatForLocale()?.toUpperCase();
    const localDateValue = dateValue?.toLocaleDateString(navigator.language) || '';

    const handleChange = (newValue: string) => {
        const parsedDate = parse(newValue, getIntlDateFormatForLocale(), new Date());
        if (isValid(parsedDate)) onUpdate(parsedDate);
    };

    const validateDate = () => {
        if (!isValid(dateValue)) {
            onError(`Please enter the date in valid format: ${dateFormat}`);
            return;
        }

        const isStartCalendar = calendarType === CALENDAR_TYPES.START_CALENDAR;
        const isEndCalendar = calendarType === CALENDAR_TYPES.END_CALENDAR;

        if (compareDate && isStartCalendar && isAfter(dateValue, compareDate)) {
            onError('Start date must be before the end date.');
        } else if (compareDate && isEndCalendar && isBefore(dateValue, compareDate)) {
            onError('End date must be after the start date.');
        } else {
            onValidate(dateValue);
        }
    };

    return (
        <div className="h-[82px] flex flex-col items-start px-5 gap-1.5 pt-4 w-full">
            <span className="text-sm font-medium text-n-slate-12">
                {calendarType === CALENDAR_TYPES.START_CALENDAR
                    ? t('DATE_PICKER.DATE_RANGE_INPUT.START')
                    : t('DATE_PICKER.DATE_RANGE_INPUT.END')}
            </span>
            <input
                value={localDateValue}
                type="text"
                className="!text-sm !mb-0"
                placeholder={dateFormat}
                disabled={isDisabled}
                onChange={event => handleChange(event.target.value)}
                onKeyPress={event => {
                    if (event.key === 'Enter') validateDate();
                }}
            />
        </div>
    );
}
