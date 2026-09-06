import { format, isSameYear, isValid } from 'date-fns';

import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import { dateRanges } from '../helpers/datePickerHelper';
import { t } from '../../../../../i18n';

// Port từ DatePicker/components/DatePickerButton.vue
interface DatePickerButtonProps {
    selectedStartDate: Date;
    selectedEndDate: Date | null;
    selectedRange?: string;
    showMonthNavigation?: boolean;
    canNavigateNext?: boolean;
    navigationLabel?: string | null;
    onOpen: () => void;
    onNavigateMonth: (direction: 'prev' | 'next') => void;
}

export default function DatePickerButton({
    selectedStartDate,
    selectedEndDate,
    selectedRange = '',
    showMonthNavigation = false,
    canNavigateNext = false,
    navigationLabel = null,
    onOpen,
    onNavigateMonth,
}: DatePickerButtonProps) {
    const formatDateRange = () => {
        if (!isValid(selectedStartDate) || !selectedEndDate || !isValid(selectedEndDate)) {
            return 'Select a date range';
        }

        if (!isSameYear(selectedStartDate, selectedEndDate)) {
            return `${format(selectedStartDate, 'MMM d, yyyy')} - ${format(selectedEndDate, 'MMM d, yyyy')}`;
        }

        return `${format(selectedStartDate, 'MMM d')} - ${format(selectedEndDate, 'MMM d, yyyy')}`;
    };

    const activeDateRange = dateRanges.find(range => range.value === selectedRange)?.label ?? '';

    return (
        <div className="inline-flex items-center gap-1">
            <button
                type="button"
                className="inline-flex relative items-center rounded-lg gap-2 py-1.5 px-3 h-8 bg-n-alpha-2 hover:bg-n-alpha-1 active:bg-n-alpha-1 flex-shrink-0"
                onClick={onOpen}
            >
                <Icon icon="i-lucide-calendar-range" className="text-n-slate-11 size-3.5 flex-shrink-0" />
                <span className="text-sm font-medium text-n-slate-12 truncate">
                    {navigationLabel || t(activeDateRange)}
                </span>
                <span className="text-sm font-medium text-n-slate-11 truncate">{formatDateRange()}</span>
                <Icon icon="i-lucide-chevron-down" className="text-n-slate-12 size-4 flex-shrink-0" />
            </button>
            {showMonthNavigation && (
                <Button
                    slate
                    faded
                    sm
                    icon="i-lucide-chevron-left"
                    className="rtl:rotate-180"
                    title={t('DATE_PICKER.PREVIOUS_PERIOD')}
                    onClick={() => onNavigateMonth('prev')}
                />
            )}
            {showMonthNavigation && (
                <Button
                    slate
                    faded
                    sm
                    icon="i-lucide-chevron-right"
                    className="rtl:rotate-180"
                    title={t('DATE_PICKER.NEXT_PERIOD')}
                    disabled={!canNavigateNext}
                    onClick={() => onNavigateMonth('next')}
                />
            )}
        </div>
    );
}
