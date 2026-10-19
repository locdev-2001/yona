import { useEffect, useMemo, useRef, useState } from 'react';
import { differenceInDays, endOfDay, getUnixTime, startOfDay, subDays } from 'date-fns';

import DatePicker from 'dashboard/components/ui/DatePicker/DatePicker';
import { DATE_RANGE_TYPES } from 'dashboard/components/ui/DatePicker/helpers/datePickerHelper';
import type { DropdownListItem } from 'dashboard/components/ui/Dropdown/DropdownList';
import Switch from 'dashboard/components-next/switch/Switch';
import { t } from '../../../i18n';
import { GROUP_BY_FILTER, type GroupByFilter } from '../constants';
import { generateReportURLParams, parseReportURLParams } from '../helpers/reportFilterHelper';
import { currentQuery, replaceQuery } from '../helpers/urlQuery';
import ActiveFilterChip from './Filters/ActiveFilterChip';

// Port từ reports/components/ReportFilters.vue — bộ lọc thực thể (agents/inboxes/
// labels/teams) do nhóm trang d2-fe-pages truyền vào qua `entityFilter`.

export interface ReportFilterChange {
    from: number;
    to: number;
    businessHours: boolean;
    groupBy?: GroupByFilter;
}

export interface ReportEntityFilterConfig {
    filterType: 'teams' | 'inboxes' | 'labels' | 'agents';
    options: DropdownListItem[];
    selectedId: number | null;
    placeholder: string;
    defaultLabel: string;
    onSelect: (item: DropdownListItem) => void;
}

interface ReportFiltersProps {
    showGroupBy?: boolean;
    showBusinessHours?: boolean;
    entityFilter?: ReportEntityFilterConfig;
    onFilterChange: (payload: ReportFilterChange) => void;
}

const getUnixStartOfDay = (date: Date) => getUnixTime(startOfDay(date));
const getUnixEndOfDay = (date: Date) => getUnixTime(endOfDay(date));

export default function ReportFilters({
    showGroupBy = true,
    showBusinessHours = true,
    entityFilter,
    onFilterChange,
}: ReportFiltersProps) {
    const initialParams = useRef(parseReportURLParams(currentQuery())).current;

    const [showSubDropdownMenu, setShowSubDropdownMenu] = useState(false);
    const [showGroupByDropdown, setShowGroupByDropdown] = useState(false);
    const [activeFilterType, setActiveFilterType] = useState('');
    const [customDateRange, setCustomDateRange] = useState<[Date, Date]>(() =>
        initialParams.from && initialParams.to
            ? [new Date(initialParams.from * 1000), new Date(initialParams.to * 1000)]
            : [subDays(new Date(), 6), new Date()],
    );
    const [selectedDateRange, setSelectedDateRange] = useState<string>(
        initialParams.range || DATE_RANGE_TYPES.LAST_7_DAYS,
    );
    const [businessHoursSelected, setBusinessHoursSelected] = useState(initialParams.businessHours);
    const [groupBy, setGroupBy] = useState<GroupByFilter>(
        (initialParams.groupBy && GROUP_BY_FILTER[initialParams.groupBy]) || GROUP_BY_FILTER[1],
    );

    const daysDifference = differenceInDays(customDateRange[1], customDateRange[0]);
    const isGroupByPossible = showGroupBy && daysDifference >= 29;

    const groupByfilterItemsList = useMemo<DropdownListItem[]>(() => {
        const options = {
            WEEK: [
                { id: 1, name: t('REPORT.GROUPING_OPTIONS.DAY') },
                { id: 2, name: t('REPORT.GROUPING_OPTIONS.WEEK') },
            ],
            MONTH: [
                { id: 1, name: t('REPORT.GROUPING_OPTIONS.DAY') },
                { id: 2, name: t('REPORT.GROUPING_OPTIONS.WEEK') },
                { id: 3, name: t('REPORT.GROUPING_OPTIONS.MONTH') },
            ],
            YEAR: [
                { id: 2, name: t('REPORT.GROUPING_OPTIONS.WEEK') },
                { id: 3, name: t('REPORT.GROUPING_OPTIONS.MONTH') },
                { id: 4, name: t('REPORT.GROUPING_OPTIONS.YEAR') },
            ],
        };
        if (daysDifference >= 364) return options.YEAR;
        if (daysDifference >= 90) return options.MONTH;
        return options.WEEK;
    }, [daysDifference]);

    const onFilterChangeRef = useRef(onFilterChange);
    onFilterChangeRef.current = onFilterChange;

    const emitChange = (next?: { range?: [Date, Date]; rangeType?: string; businessHours?: boolean; groupBy?: GroupByFilter }) => {
        const range = next?.range ?? customDateRange;
        const rangeType = next?.rangeType ?? selectedDateRange;
        const business = next?.businessHours ?? businessHoursSelected;
        const activeGroupBy = next?.groupBy ?? groupBy;
        const from = getUnixStartOfDay(range[0]);
        const to = getUnixEndOfDay(range[1]);
        const groupByPossible = showGroupBy && differenceInDays(range[1], range[0]) >= 29;

        replaceQuery(
            generateReportURLParams({
                from,
                to,
                businessHours: business,
                groupBy: groupByPossible ? activeGroupBy.id : null,
                range: rangeType,
            }),
        );

        const payload: ReportFilterChange = { from, to, businessHours: business };
        if (showGroupBy) {
            payload.groupBy = groupByPossible ? activeGroupBy : GROUP_BY_FILTER[1];
        }
        onFilterChangeRef.current(payload);
    };

    // onMounted của bản gốc: khôi phục từ URL rồi phát bộ lọc đầu tiên.
    useEffect(() => {
        emitChange();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onDateRangeChange = ([startDate, endDate, rangeType]: [Date, Date, string]) => {
        const range: [Date, Date] = [startDate, endDate];
        const nextRangeType = rangeType || DATE_RANGE_TYPES.CUSTOM_RANGE;
        setCustomDateRange(range);
        setSelectedDateRange(nextRangeType);

        const nextDaysDifference = differenceInDays(endDate, startDate);
        const nextList =
            nextDaysDifference >= 364
                ? [2, 3, 4]
                : nextDaysDifference >= 90
                  ? [1, 2, 3]
                  : [1, 2];
        let nextGroupBy = groupBy;
        if (!nextList.includes(groupBy.id)) {
            nextGroupBy = GROUP_BY_FILTER[nextList[0]];
            setGroupBy(nextGroupBy);
        }

        emitChange({ range, rangeType: nextRangeType, groupBy: nextGroupBy });
    };

    const selectedGroupByName =
        groupByfilterItemsList.find(item => item.id === groupBy?.id)?.name ||
        t('REPORT.GROUP_BY_FILTER_DROPDOWN_LABEL');

    const selectedFilterName = entityFilter
        ? (entityFilter.options.find(item => item.id === entityFilter.selectedId)?.name ?? entityFilter.defaultLabel)
        : '';

    return (
        <div className="flex flex-col w-full gap-3 lg:flex-row">
            <DatePicker
                dateRange={customDateRange}
                rangeType={selectedDateRange}
                onDateRangeChanged={onDateRangeChange}
            />

            <div className="flex gap-2 items-center w-full">
                {entityFilter && (
                    <ActiveFilterChip
                        id={entityFilter.selectedId}
                        name={selectedFilterName}
                        type={entityFilter.filterType}
                        options={entityFilter.options}
                        activeFilterType={activeFilterType}
                        showMenu={showSubDropdownMenu}
                        placeholder={entityFilter.placeholder}
                        showClearFilter={false}
                        enableSearch
                        onToggleDropdown={filterType => {
                            setShowGroupByDropdown(false);
                            setActiveFilterType(filterType);
                            setShowSubDropdownMenu(current => !current);
                        }}
                        onCloseDropdown={() => {
                            setShowSubDropdownMenu(false);
                            setActiveFilterType('');
                        }}
                        onAddFilter={item => {
                            setShowSubDropdownMenu(false);
                            setActiveFilterType('');
                            entityFilter.onSelect(item);
                        }}
                    />
                )}

                {isGroupByPossible && (
                    <ActiveFilterChip
                        id={groupBy?.id}
                        name={selectedGroupByName}
                        type="groupBy"
                        options={groupByfilterItemsList}
                        activeFilterType={showGroupByDropdown ? 'groupBy' : ''}
                        showMenu={showGroupByDropdown}
                        placeholder={t('REPORT.GROUP_BY_FILTER_DROPDOWN_LABEL')}
                        enableSearch={false}
                        showClearFilter={false}
                        onToggleDropdown={() => setShowGroupByDropdown(current => !current)}
                        onCloseDropdown={() => setShowGroupByDropdown(false)}
                        onAddFilter={item => {
                            const nextGroupBy = GROUP_BY_FILTER[Number(item.id)];
                            setGroupBy(nextGroupBy);
                            setShowGroupByDropdown(false);
                            emitChange({ groupBy: nextGroupBy });
                        }}
                        onRemoveFilter={() => undefined}
                    />
                )}

                {showBusinessHours && (
                    <div className="flex items-center flex-shrink-0 ltr:ml-auto rtl:mr-auto">
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
                )}
            </div>
        </div>
    );
}
