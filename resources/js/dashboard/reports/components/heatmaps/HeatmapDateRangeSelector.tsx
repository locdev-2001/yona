import { useEffect, useMemo, useRef, useState } from 'react';
import { addMonths, differenceInCalendarDays, endOfDay, endOfMonth, startOfDay, startOfMonth, subDays } from 'date-fns';

import Button from 'dashboard/components-next/button/Button';
import DropdownMenu, { type DropdownMenuItem } from 'dashboard/components-next/dropdown-menu/DropdownMenu';
import { useClickAway } from 'dashboard/composables/useClickAway';
import { t } from '../../../../i18n';

// Port từ reports/components/heatmaps/HeatmapDateRangeSelector.vue

const DATE_FILTER_TYPES = { DAY: 'day', MONTH: 'month' } as const;
const DATE_FILTER_ACTION = 'select_date_range';

type DateFilterType = (typeof DATE_FILTER_TYPES)[keyof typeof DATE_FILTER_TYPES];

interface RangeConfig {
    label: string;
    value: string;
    action: string;
    type: DateFilterType;
    daysBefore?: number;
    monthOffset?: number;
}

interface HeatmapDateRangeSelectorProps {
    onChange: (payload: { from: Date; to: Date; daysBefore: number; type: DateFilterType; monthOffset: number }) => void;
}

export default function HeatmapDateRangeSelector({ onChange }: HeatmapDateRangeSelectorProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    useClickAway(dropdownRef, () => setShowDropdown(false), showDropdown);

    const menuItems: RangeConfig[] = useMemo(() => {
        const now = new Date();
        const monthFormatter = new Intl.DateTimeFormat((navigator.language || 'en').replace('_', '-'), {
            month: 'long',
            year: 'numeric',
        });

        return [
            {
                label: t('REPORT.DATE_RANGE_OPTIONS.LAST_7_DAYS'),
                value: 'last_7_days',
                action: DATE_FILTER_ACTION,
                type: DATE_FILTER_TYPES.DAY,
                daysBefore: 6,
            },
            {
                label: t('REPORT.DATE_RANGE_OPTIONS.LAST_14_DAYS'),
                value: 'last_14_days',
                action: DATE_FILTER_ACTION,
                type: DATE_FILTER_TYPES.DAY,
                daysBefore: 13,
            },
            {
                label: t('REPORT.DATE_RANGE_OPTIONS.LAST_30_DAYS'),
                value: 'last_30_days',
                action: DATE_FILTER_ACTION,
                type: DATE_FILTER_TYPES.DAY,
                daysBefore: 29,
            },
            ...[0, -1, -2].map(offset => ({
                label: offset === 0 ? t('REPORT.DATE_RANGE_OPTIONS.THIS_MONTH') : monthFormatter.format(addMonths(now, offset)),
                value: offset === 0 ? 'this_month' : `month_${offset}`,
                action: DATE_FILTER_ACTION,
                type: DATE_FILTER_TYPES.MONTH,
                monthOffset: offset,
            })),
        ];
    }, []);

    const [selectedValue, setSelectedValue] = useState(menuItems[0]?.value ?? '');
    const selectedConfig = menuItems.find(item => item.value === selectedValue) || menuItems[0];

    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    // watch(selectedConfig, applySelection, { immediate: true }) của bản gốc.
    useEffect(() => {
        if (!selectedConfig) return;

        const monthOffset = selectedConfig.type === DATE_FILTER_TYPES.MONTH ? selectedConfig.monthOffset || 0 : 0;

        if (selectedConfig.type === DATE_FILTER_TYPES.MONTH) {
            const now = new Date();
            const baseMonthStart = startOfMonth(addMonths(now, monthOffset));
            const from = startOfDay(baseMonthStart);
            const isCurrentMonth = selectedConfig.value === 'this_month' && monthOffset === 0;
            const to = isCurrentMonth ? endOfDay(now) : endOfDay(endOfMonth(baseMonthStart));
            onChangeRef.current({
                from,
                to,
                daysBefore: differenceInCalendarDays(to, from),
                type: selectedConfig.type,
                monthOffset,
            });
            return;
        }

        const to = endOfDay(new Date());
        const daysBefore = Number(selectedConfig.daysBefore);
        onChangeRef.current({
            from: startOfDay(subDays(to, daysBefore)),
            to,
            daysBefore,
            type: selectedConfig.type,
            monthOffset,
        });
    }, [selectedConfig]);

    const dropdownItems: DropdownMenuItem[] = menuItems.map(item => ({
        label: item.label,
        value: item.value,
        action: item.action,
        isSelected: selectedValue === item.value,
    }));

    return (
        <div ref={dropdownRef} className="relative flex items-center group">
            <Button
                sm
                slate
                faded
                label={selectedConfig?.label ?? ''}
                className="rounded-md group-hover:bg-n-alpha-2"
                onClick={() => setShowDropdown(current => !current)}
            />
            {showDropdown && (
                <DropdownMenu
                    menuItems={dropdownItems}
                    className="mt-1 ltr:right-0 rtl:left-0 xl:ltr:right-0 xl:rtl:left-0 top-full"
                    onAction={item => {
                        setShowDropdown(false);
                        if (item.action !== DATE_FILTER_ACTION) return;
                        setSelectedValue(String(item.value));
                    }}
                />
            )}
        </div>
    );
}
