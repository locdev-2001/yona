import { useRef, useState } from 'react';
import { endOfDay, format, fromUnixTime, getUnixTime, startOfDay, subDays, subMonths } from 'date-fns';

import { t } from '../../../i18n';
import { useClickAway } from 'dashboard/composables/useClickAway';
import Button from 'dashboard/components-next/button/Button';
import DropdownMenu from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { DATE_RANGE_TYPES, SEARCH_LOOKBACK_MONTHS } from '../helpers/searchHelper';
import type { SearchDateRange } from '../types';

// Port từ dashboard/modules/search/components/SearchDateRangeSelector.vue.
const DATE_FILTER_ACTION_PRESET = 'preset';

const PRESET_RANGES = [
    { labelKey: 'SEARCH.DATE_RANGE.LAST_7_DAYS', value: DATE_RANGE_TYPES.LAST_7_DAYS, days: 7 },
    { labelKey: 'SEARCH.DATE_RANGE.LAST_30_DAYS', value: DATE_RANGE_TYPES.LAST_30_DAYS, days: 30 },
    { labelKey: 'SEARCH.DATE_RANGE.LAST_60_DAYS', value: DATE_RANGE_TYPES.LAST_60_DAYS, days: 60 },
    { labelKey: 'SEARCH.DATE_RANGE.LAST_90_DAYS', value: DATE_RANGE_TYPES.LAST_90_DAYS, days: 90 },
];

const CUSTOM_RANGE_TYPES: (string | null)[] = [DATE_RANGE_TYPES.BETWEEN, DATE_RANGE_TYPES.CUSTOM];

interface SearchDateRangeSelectorProps {
    value: SearchDateRange;
    className?: string;
    onChange: (dateRange: SearchDateRange) => void;
}

export default function SearchDateRangeSelector({ value, className = '', onChange }: SearchDateRangeSelectorProps) {
    const container = useRef<HTMLDivElement>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');

    useClickAway(container, () => setShowDropdown(false));

    const minDate = format(subMonths(new Date(), SEARCH_LOOKBACK_MONTHS), 'yyyy-MM-dd');
    const maxDate = format(new Date(), 'yyyy-MM-dd');
    const hasCustomDates = Boolean(customFrom && customTo);

    const selectedValue = !value?.from && !value?.to && !value?.type ? '' : (value?.type ?? DATE_RANGE_TYPES.CUSTOM);

    const applySelection = (dateRange: SearchDateRange) => onChange(dateRange);

    const formatDate = (timestamp: number) => format(fromUnixTime(timestamp), 'MMM d, yyyy');

    const selectedLabel = (() => {
        const prefix = t('SEARCH.DATE_RANGE.TIME_RANGE');
        if (!selectedValue) return prefix;

        const preset = PRESET_RANGES.find(item => item.value === selectedValue);
        if (preset) return `${prefix}: ${t(preset.labelKey)}`;

        if (value.from && value.to) return `${prefix}: ${formatDate(value.from)} - ${formatDate(value.to)}`;

        return `${prefix}: ${t('SEARCH.DATE_RANGE.CUSTOM_RANGE')}`;
    })();

    const onToggleDropdown = () => {
        if (!showDropdown) {
            if (CUSTOM_RANGE_TYPES.includes(value?.type ?? null)) {
                setCustomFrom(value.from ? format(fromUnixTime(value.from), 'yyyy-MM-dd') : '');
                setCustomTo(value.to ? format(fromUnixTime(value.to), 'yyyy-MM-dd') : '');
            } else {
                setCustomFrom('');
                setCustomTo('');
            }
        }
        setShowDropdown(open => !open);
    };

    return (
        <div ref={container} className={`relative flex items-center group min-w-0 max-w-full ${className}`.trim()}>
            <Button
                sm
                slate
                variant={showDropdown ? 'faded' : 'solid'}
                label={selectedLabel}
                className="group-hover:bg-n-alpha-2 max-w-full"
                trailingIcon
                icon="i-lucide-chevron-down"
                onClick={onToggleDropdown}
            />
            {showDropdown ? (
                <DropdownMenu
                    className="mt-1 ltr:left-0 rtl:right-0 top-full w-64"
                    menuItems={PRESET_RANGES.map(item => ({
                        label: t(item.labelKey),
                        value: item.value,
                        action: DATE_FILTER_ACTION_PRESET,
                        days: item.days,
                        isSelected: selectedValue === item.value,
                    }))}
                    onAction={item => {
                        if (selectedValue === item.value) {
                            applySelection({ type: null, from: null, to: null });
                            setCustomFrom('');
                            setCustomTo('');
                            setShowDropdown(false);

                            return;
                        }
                        setCustomFrom('');
                        setCustomTo('');
                        const end = endOfDay(new Date());
                        applySelection({
                            type: String(item.value),
                            from: getUnixTime(startOfDay(subDays(end, item.days as number))),
                            to: getUnixTime(end),
                        });
                        setShowDropdown(false);
                    }}
                    footer={
                        <>
                            <div className="h-1" aria-hidden="true" />
                            <div className="flex flex-col gap-2 px-2 py-2">
                                <div className="flex items-center justify-between gap-2 px-1 h-9">
                                    <span className="text-sm text-n-slate-11">
                                        {t('SEARCH.DATE_RANGE.CUSTOM_RANGE')}
                                    </span>
                                    <span className="text-sm text-n-slate-12">
                                        {t('SEARCH.DATE_RANGE.CREATED_BETWEEN')}
                                    </span>
                                </div>
                                <input
                                    value={customFrom}
                                    type="date"
                                    min={minDate}
                                    max={customTo || maxDate}
                                    className="!w-full !mb-0 !rounded-lg !px-3 !py-2 !text-sm text-n-slate-12 !h-8"
                                    onChange={event => setCustomFrom(event.target.value)}
                                />
                                <div className="flex items-center gap-3 h-5 px-1">
                                    <div className="flex-1 h-px bg-n-weak" />
                                    <span className="text-sm text-n-slate-11">{t('SEARCH.DATE_RANGE.AND')}</span>
                                    <div className="flex-1 h-px bg-n-weak" />
                                </div>
                                <input
                                    value={customTo}
                                    type="date"
                                    min={customFrom || minDate}
                                    max={maxDate}
                                    className="!w-full !mb-0 !rounded-lg !px-3 !py-2 !text-sm text-n-slate-12 !h-8"
                                    onChange={event => setCustomTo(event.target.value)}
                                />
                                <div className="flex items-center gap-2 mt-2">
                                    <Button
                                        sm
                                        slate
                                        faded
                                        label={t('SEARCH.DATE_RANGE.CLEAR_FILTER')}
                                        disabled={!hasCustomDates}
                                        className="flex-1 justify-center"
                                        onClick={() => {
                                            setCustomFrom('');
                                            setCustomTo('');
                                        }}
                                    />
                                    <Button
                                        sm
                                        solid
                                        color="blue"
                                        label={t('SEARCH.DATE_RANGE.APPLY')}
                                        disabled={!hasCustomDates}
                                        className="flex-1 justify-center"
                                        onClick={() => {
                                            if (!customFrom || !customTo) return;
                                            applySelection({
                                                type: DATE_RANGE_TYPES.BETWEEN,
                                                from: getUnixTime(startOfDay(new Date(customFrom))),
                                                to: getUnixTime(endOfDay(new Date(customTo))),
                                            });
                                            setShowDropdown(false);
                                        }}
                                    />
                                </div>
                            </div>
                        </>
                    }
                />
            ) : null}
        </div>
    );
}
