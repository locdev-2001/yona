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
        <div className="w-[200px] flex flex-col items-start bg-n-surface-canvas">
            <h4 className="w-full px-5 py-4 text-xs font-bold capitalize text-start text-n-slate-10">
                {t('DATE_PICKER.DATE_RANGE_OPTIONS.TITLE')}
            </h4>
            <div className="flex flex-col items-start w-full">
                {dateRanges.map(range => (
                    <Fragment key={range.label}>
                        {range.separator && <div className="w-full h-2" aria-hidden="true" />}
                        <button
                            type="button"
                            className={`w-full px-5 py-3 text-sm font-medium truncate border-none rounded-none text-start hover:bg-n-surface-hover ${
                                range.value === selectedRange ? 'text-n-slate-12 bg-n-surface-selected' : 'text-n-slate-12'
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
