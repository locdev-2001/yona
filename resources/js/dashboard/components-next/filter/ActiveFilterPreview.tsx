import { Fragment } from 'react';

import Button from 'dashboard/components-next/button/Button';
import type { ConversationFilterCondition, FilterOption, FilterValue } from './helper/filterHelper';
import { replaceUnderscoreWithSpace } from './helper/filterHelper';

// Port từ components-next/filter/ActiveFilterPreview.vue
const OPERATOR_LABELS: Record<string, string> = {
    equal_to: 'is',
    not_equal_to: 'is not',
    contains: 'contains',
    does_not_contain: 'does not contain',
    is_present: 'is present',
    is_not_present: 'is not present',
    is_greater_than: 'is greater than',
    is_less_than: 'is less than',
    days_before: 'days before',
};

const LOWERCASE_KEYS = ['email'];

const formatFilterValue = (value: FilterValue): string => {
    if (!value) return '';
    if (Array.isArray(value)) return value.map(item => (item as FilterOption)?.name ?? item).join(', ');
    if (typeof value === 'object') return String((value as FilterOption).name ?? '');

    return String(value);
};

interface ActiveFilterPreviewProps {
    appliedFilters: ConversationFilterCondition[];
    maxVisibleFilters?: number;
    clearButtonLabel?: string;
    moreFiltersLabel?: string;
    showClearButton?: boolean;
    className?: string;
    onClearFilters: () => void;
    onOpenFilter: () => void;
}

export default function ActiveFilterPreview({
    appliedFilters,
    maxVisibleFilters = 2,
    clearButtonLabel = '',
    moreFiltersLabel = '',
    showClearButton = true,
    className = '',
    onClearFilters,
    onOpenFilter,
}: ActiveFilterPreviewProps) {
    return (
        <div className={`flex flex-wrap items-center w-full gap-2 mx-auto ${className}`.trim()}>
            {appliedFilters.map((filter, index) =>
                index < maxVisibleFilters ? (
                    <div key={index} className="inline-flex items-center gap-2 h-7">
                        <div
                            className="flex items-center h-full min-w-0 gap-1 px-2 py-1 text-xs border rounded-lg hover:bg-n-solid-2 max-w-72 border-n-weak hover:cursor-pointer"
                            onClick={onOpenFilter}
                        >
                            <span className="lowercase whitespace-nowrap first-letter:capitalize text-n-slate-12">
                                {replaceUnderscoreWithSpace(filter.attributeKey)}
                            </span>
                            <span className="px-1 text-xs text-n-slate-10 whitespace-nowrap">
                                {OPERATOR_LABELS[filter.filterOperator] ??
                                    replaceUnderscoreWithSpace(filter.filterOperator)}
                            </span>
                            {filter.values ? (
                                <span
                                    title={formatFilterValue(filter.values)}
                                    className={`lowercase truncate text-n-slate-12 ${
                                        LOWERCASE_KEYS.includes(filter.attributeKey) ? '' : 'first-letter:capitalize'
                                    }`}
                                >
                                    {formatFilterValue(filter.values)}
                                </span>
                            ) : null}
                        </div>
                        {index < maxVisibleFilters - 1 && index < appliedFilters.length - 1 ? (
                            <span className="content-center h-full px-1 text-xs font-medium uppercase rounded-lg text-n-slate-10">
                                {filter.queryOperator}
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <Fragment key={index} />
                ),
            )}
            {appliedFilters.length > maxVisibleFilters ? (
                <div
                    className="inline-flex items-center content-center px-1 text-xs rounded-lg text-n-slate-10 hover:text-n-slate-11 h-7 hover:cursor-pointer"
                    onClick={onOpenFilter}
                >
                    {moreFiltersLabel}
                </div>
            ) : null}
            {showClearButton ? <div className="w-px h-3 rounded-lg bg-n-strong" /> : null}
            {showClearButton ? (
                <Button label={clearButtonLabel} size="xs" className="!px-1" variant="ghost" onClick={onClearFilters} />
            ) : null}
        </div>
    );
}
