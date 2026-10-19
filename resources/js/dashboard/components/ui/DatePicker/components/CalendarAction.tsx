import Button from 'dashboard/components-next/button/Button';
import { CALENDAR_PERIODS, type CalendarPeriod, type CalendarType } from '../helpers/datePickerHelper';

// Port từ DatePicker/components/CalendarAction.vue
interface CalendarActionProps {
    calendarType?: CalendarType;
    firstButtonLabel?: string;
    buttonLabel?: string;
    viewMode?: CalendarPeriod | '';
    onPrev: (calendarType: CalendarType) => void;
    onNext: (calendarType: CalendarType) => void;
    onSetView: (calendarType: CalendarType, mode: CalendarPeriod) => void;
}

export default function CalendarAction({
    calendarType = 'start',
    firstButtonLabel = '',
    buttonLabel = '',
    viewMode = '',
    onPrev,
    onNext,
    onSetView,
}: CalendarActionProps) {
    return (
        <div className="flex items-start justify-between w-full h-9">
            <Button
                slate
                ghost
                xs
                icon="i-lucide-chevron-left"
                className="rtl:rotate-180"
                onClick={event => {
                    event.stopPropagation();
                    onPrev(calendarType);
                }}
            />
            <div className="flex items-center gap-1">
                {firstButtonLabel && (
                    <button
                        type="button"
                        className="p-0 text-sm font-medium text-center text-n-slate-12 hover:text-n-brand"
                        onClick={event => {
                            event.stopPropagation();
                            onSetView(calendarType, viewMode as CalendarPeriod);
                        }}
                    >
                        {firstButtonLabel}
                    </button>
                )}
                {buttonLabel && (
                    <button
                        type="button"
                        className={`p-0 text-sm font-medium text-center text-n-slate-12${viewMode ? ' hover:text-n-brand' : ''}`}
                        onClick={event => {
                            event.stopPropagation();
                            onSetView(calendarType, CALENDAR_PERIODS.YEAR);
                        }}
                    >
                        {buttonLabel}
                    </button>
                )}
            </div>
            <Button
                slate
                ghost
                xs
                icon="i-lucide-chevron-right"
                className="rtl:rotate-180"
                onClick={event => {
                    event.stopPropagation();
                    onNext(calendarType);
                }}
            />
        </div>
    );
}
