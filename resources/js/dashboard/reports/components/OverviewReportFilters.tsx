import { useEffect, useRef, useState } from 'react';
import { endOfDay, getUnixTime, startOfDay, subDays } from 'date-fns';

import DatePicker from 'dashboard/components/ui/DatePicker/DatePicker';
import { DATE_RANGE_TYPES } from 'dashboard/components/ui/DatePicker/helpers/datePickerHelper';
import Switch from 'dashboard/components-next/switch/Switch';
import { t } from '../../../i18n';
import { generateReportURLParams, parseReportURLParams } from '../helpers/reportFilterHelper';
import { currentQuery, replaceQuery } from '../helpers/urlQuery';

// Port từ reports/components/OverviewReportFilters.vue
interface OverviewReportFiltersProps {
    disabled?: boolean;
    onFilterChange: (payload: { from: number; to: number; businessHours: boolean }) => void;
}

export default function OverviewReportFilters({ disabled = false, onFilterChange }: OverviewReportFiltersProps) {
    const initialParams = useRef(parseReportURLParams(currentQuery())).current;

    const [customDateRange, setCustomDateRange] = useState<[Date, Date]>(() =>
        initialParams.from && initialParams.to
            ? [new Date(initialParams.from * 1000), new Date(initialParams.to * 1000)]
            : [subDays(new Date(), 6), new Date()],
    );
    const [selectedDateRange, setSelectedDateRange] = useState(initialParams.range || DATE_RANGE_TYPES.LAST_7_DAYS);
    const [businessHoursSelected, setBusinessHoursSelected] = useState(initialParams.businessHours);

    const onFilterChangeRef = useRef(onFilterChange);
    onFilterChangeRef.current = onFilterChange;

    const emitChange = (next?: { range?: [Date, Date]; rangeType?: string; businessHours?: boolean }) => {
        const range = next?.range ?? customDateRange;
        const rangeType = next?.rangeType ?? selectedDateRange;
        const business = next?.businessHours ?? businessHoursSelected;
        const from = getUnixTime(startOfDay(range[0]));
        const to = getUnixTime(endOfDay(range[1]));

        replaceQuery(generateReportURLParams({ from, to, businessHours: business, range: rangeType }));
        onFilterChangeRef.current({ from, to, businessHours: business });
    };

    useEffect(() => {
        emitChange();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            className={`flex flex-col justify-between gap-3 md:flex-row${disabled ? ' pointer-events-none opacity-50' : ''}`}
        >
            <div className="flex flex-col flex-wrap items-start gap-2 md:flex-row">
                <DatePicker
                    dateRange={customDateRange}
                    rangeType={selectedDateRange}
                    onDateRangeChanged={([startDate, endDate, rangeType]) => {
                        const range: [Date, Date] = [startDate, endDate];
                        const nextRangeType = rangeType || DATE_RANGE_TYPES.CUSTOM_RANGE;
                        setCustomDateRange(range);
                        setSelectedDateRange(nextRangeType);
                        emitChange({ range, rangeType: nextRangeType });
                    }}
                />
            </div>
            <div className="flex items-center">
                <span className="mx-2 text-sm whitespace-nowrap">{t('REPORT.BUSINESS_HOURS')}</span>
                <span>
                    <Switch
                        value={businessHoursSelected}
                        onChange={value => {
                            setBusinessHoursSelected(value);
                            emitChange({ businessHours: value });
                        }}
                    />
                </span>
            </div>
        </div>
    );
}
