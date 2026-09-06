import { Fragment } from 'react';

import { dateRanges, type DateRangeOption } from '../helpers/datePickerHelper';
import { t } from '../../../../../i18n';

// Port từ DatePicker/components/CalendarDateRange.vue
export default function CalendarDateRange({
    selectedRange = '',
    onSetRange,
}: {
    selectedRange?: string;
    onSetRange: (range: DateRangeOption) => void;
}) {
    return (
        <div className="w-[200px] flex flex-col items-start">
            <h4 className="w-full px-5 py-4 text-xs font-bold capitalize text-start text-n-slate-10">
                {t('DATE_PICKER.DATE_RANGE_OPTIONS.TITLE')}
            </h4>
            <div className="flex flex-col items-start w-full">
                {dateRanges.map(range => (
                    <Fragment key={range.label}>
                        {range.separator && <div className="w-full border-t border-n-strong" />}
                        <button
                            type="button"
                            className={`w-full px-5 py-3 text-sm font-medium truncate border-none rounded-none text-start hover:bg-n-alpha-2 dark:hover:bg-n-solid-3 ${
                                range.value === selectedRange
                                    ? 'text-n-slate-12 bg-n-alpha-1 dark:bg-n-solid-active'
                                    : 'text-n-slate-12'
                            }`}
                            onClick={() => onSetRange(range)}
                        >
                            {t(range.label)}
                        </button>
                    </Fragment>
                ))}
            </div>
        </div>
    );
}
