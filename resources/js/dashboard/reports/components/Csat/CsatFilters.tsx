import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { endOfDay, fromUnixTime, getUnixTime, startOfDay, subDays } from 'date-fns';

import DatePicker from 'dashboard/components/ui/DatePicker/DatePicker';
import { DATE_RANGE_TYPES } from 'dashboard/components/ui/DatePicker/helpers/datePickerHelper';
import DropdownButton from 'dashboard/components/ui/Dropdown/DropdownButton';
import type { DropdownListItem } from 'dashboard/components/ui/Dropdown/DropdownList';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';
import { useAccountDirectory } from '../../composables/useAccountDirectory';
import { generateCompleteURLParams, parseFilterURLParams, parseReportURLParams } from '../../helpers/reportFilterHelper';
import { currentQuery, replaceQuery } from '../../helpers/urlQuery';
import ActiveFilterChip from '../Filters/ActiveFilterChip';
import AddFilterChip, { type FilterMenuOption } from '../Filters/AddFilterChip';
import {
    buildFilterList,
    buildRatingsList,
    getActiveFilter,
    keyToFilterType,
    typeToFilterKey,
    type CsatFilterKey,
    type CsatFilterType,
} from './csatFilterHelpers';

// Port từ reports/components/Csat/CsatFilters.vue

export interface CsatFilterChange {
    from: number;
    to: number;
    selectedAgents: { id: number }[];
    selectedInbox: { id: number } | null;
    selectedTeam: { id: number } | null;
    selectedRating: { value: number } | null;
}

type AppliedFilters = Record<CsatFilterKey, number | null>;

interface CsatFiltersProps {
    showTeamFilter?: boolean;
    onFilterChange: (payload: CsatFilterChange) => void;
}

export default function CsatFilters({ showTeamFilter = false, onFilterChange }: CsatFiltersProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const directory = useAccountDirectory(currentAccount.id, ['agents', 'inboxes', 'teams']);

    const initial = useRef({
        params: parseReportURLParams(currentQuery()),
        filters: parseFilterURLParams(currentQuery()),
    }).current;

    const [showDropdownMenu, setShowDropdownMenu] = useState(false);
    const [showSubDropdownMenu, setShowSubDropdownMenu] = useState(false);
    const [activeFilterType, setActiveFilterType] = useState('');
    const [customDateRange, setCustomDateRange] = useState<[Date, Date]>(() =>
        initial.params.from && initial.params.to
            ? [fromUnixTime(initial.params.from), fromUnixTime(initial.params.to)]
            : [subDays(new Date(), 6), new Date()],
    );
    const [selectedDateRange, setSelectedDateRange] = useState(initial.params.range || DATE_RANGE_TYPES.LAST_7_DAYS);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
        user_ids: initial.filters.agent_id ?? null,
        inbox_id: initial.filters.inbox_id ?? null,
        team_id: initial.filters.team_id ?? null,
        rating: initial.filters.rating ?? null,
    });

    const ratings = buildRatingsList(t);

    const getFilterSource = (type: CsatFilterType) => {
        const sources = {
            agents: directory.agents,
            inboxes: directory.inboxes,
            teams: directory.teams,
            ratings,
        };
        return (sources[type] ?? []) as { id: number; name?: string; emoji?: string }[];
    };

    const getFilterOptions = (type: CsatFilterType): DropdownListItem[] =>
        type === 'ratings' ? ratings : buildFilterList(getFilterSource(type), type);

    const filterTypes: { id: string; name: string; type: CsatFilterType }[] = [
        { id: '1', name: t('CSAT_REPORTS.FILTERS.AGENTS.LABEL'), type: 'agents' },
        { id: '2', name: t('CSAT_REPORTS.FILTERS.INBOXES.LABEL'), type: 'inboxes' },
        { id: '3', name: t('CSAT_REPORTS.FILTERS.RATINGS.LABEL'), type: 'ratings' },
    ];
    if (showTeamFilter) {
        filterTypes.splice(2, 0, { id: '4', name: t('CSAT_REPORTS.FILTERS.TEAMS.LABEL'), type: 'teams' });
    }

    const activeFilterKeys = (Object.keys(appliedFilters) as CsatFilterKey[]).filter(key => appliedFilters[key]);
    const activeFilterTypes = activeFilterKeys.map(keyToFilterType);

    const filterListMenuItems: FilterMenuOption[] = filterTypes
        .filter(({ type }) => !activeFilterTypes.includes(type))
        .map(({ id, name, type }) => ({ id, name, type, options: getFilterOptions(type) }));

    const activeFilters = activeFilterKeys.map(key => {
        const filterType = keyToFilterType(key);
        const item = getActiveFilter(getFilterSource(filterType), filterType, appliedFilters[key] as number);
        return {
            id: item?.id ?? (appliedFilters[key] as number),
            name: item?.name ?? `ID: ${appliedFilters[key]}`,
            type: filterType,
            options: getFilterOptions(filterType),
        };
    });

    const hasActiveFilters = Object.values(appliedFilters).some(value => value !== null);
    const isAllFilterSelected = !filterListMenuItems.length;

    const onFilterChangeRef = useRef(onFilterChange);
    onFilterChangeRef.current = onFilterChange;

    const emitChange = (next?: { filters?: AppliedFilters; range?: [Date, Date]; rangeType?: string }) => {
        const filters = next?.filters ?? appliedFilters;
        const range = next?.range ?? customDateRange;
        const rangeType = next?.rangeType ?? selectedDateRange;
        const from = getUnixTime(startOfDay(range[0]));
        const to = getUnixTime(endOfDay(range[1]));

        replaceQuery(
            generateCompleteURLParams({
                from,
                to,
                range: rangeType,
                filters: {
                    agent_id: filters.user_ids,
                    inbox_id: filters.inbox_id,
                    team_id: filters.team_id,
                    rating: filters.rating,
                },
            }),
        );

        onFilterChangeRef.current({
            from,
            to,
            selectedAgents: filters.user_ids ? [{ id: filters.user_ids }] : [],
            selectedInbox: filters.inbox_id ? { id: filters.inbox_id } : null,
            selectedTeam: filters.team_id ? { id: filters.team_id } : null,
            selectedRating: filters.rating ? { value: filters.rating } : null,
        });
    };

    useEffect(() => {
        emitChange();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const closeActiveFilterDropdown = () => {
        setActiveFilterType('');
        setShowSubDropdownMenu(false);
    };

    const addFilter = (item: DropdownListItem) => {
        const nextFilters = { ...appliedFilters, [typeToFilterKey(item.type as CsatFilterType)]: Number(item.id) };
        setAppliedFilters(nextFilters);
        emitChange({ filters: nextFilters });
        setShowDropdownMenu(false);
        closeActiveFilterDropdown();
    };

    const removeFilter = (type: string) => {
        const nextFilters = { ...appliedFilters, [typeToFilterKey(type as CsatFilterType)]: null };
        setAppliedFilters(nextFilters);
        emitChange({ filters: nextFilters });
    };

    const clearAllFilters = () => {
        const nextFilters: AppliedFilters = { user_ids: null, inbox_id: null, team_id: null, rating: null };
        setAppliedFilters(nextFilters);
        emitChange({ filters: nextFilters });
        setShowDropdownMenu(false);
        closeActiveFilterDropdown();
    };

    return (
        <div className="flex flex-col flex-wrap w-full gap-3 md:flex-row">
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

            <div className="flex flex-col flex-wrap items-start gap-2 md:items-center md:flex-nowrap md:flex-row">
                {hasActiveFilters && (
                    <div className="flex flex-wrap gap-2 md:flex-nowrap">
                        {activeFilters.map(filter => (
                            <ActiveFilterChip
                                key={filter.type}
                                id={filter.id}
                                name={filter.name}
                                type={filter.type}
                                options={filter.options}
                                placeholder={t(`CSAT_REPORTS.FILTERS.INPUT_PLACEHOLDER.${filter.type.toUpperCase()}`)}
                                activeFilterType={activeFilterType}
                                showMenu={showSubDropdownMenu}
                                enableSearch
                                onToggleDropdown={filterType => {
                                    setShowDropdownMenu(false);
                                    setActiveFilterType(filterType);
                                    setShowSubDropdownMenu(current => !current);
                                }}
                                onCloseDropdown={closeActiveFilterDropdown}
                                onAddFilter={addFilter}
                                onRemoveFilter={removeFilter}
                            />
                        ))}
                    </div>
                )}

                {hasActiveFilters && !isAllFilterSelected && (
                    <div className="w-full h-px border md:w-px md:h-5 border-n-weak" />
                )}

                <div className="flex items-center gap-2">
                    {!isAllFilterSelected && (
                        <AddFilterChip
                            placeholderI18nKey="CSAT_REPORTS.FILTERS.INPUT_PLACEHOLDER"
                            name={t('CSAT_REPORTS.FILTERS.ADD_FILTER')}
                            menuOption={filterListMenuItems}
                            showMenu={showDropdownMenu}
                            emptyStateMessage={t('CSAT_REPORTS.FILTERS.NO_FILTER')}
                            onToggleDropdown={() => {
                                setShowSubDropdownMenu(false);
                                setShowDropdownMenu(current => !current);
                            }}
                            onCloseDropdown={() => setShowDropdownMenu(false)}
                            onAddFilter={addFilter}
                        />
                    )}

                    {hasActiveFilters && <div className="w-px h-5 border border-n-weak" />}

                    {hasActiveFilters && (
                        <DropdownButton buttonText={t('CSAT_REPORTS.FILTERS.CLEAR_ALL')} onClick={clearAllFilters} />
                    )}
                </div>
            </div>
        </div>
    );
}
