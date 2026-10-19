import { Fragment } from 'react';

import Button from 'dashboard/components-next/button/Button';
import { t } from '../../../i18n';
import type { ConversationFilterCondition, FilterOption, FilterSelectOption, FilterType, FilterValue } from './helper/filterHelper';
import { replaceUnderscoreWithSpace } from './helper/filterHelper';

// Port từ components-next/filter/ActiveFilterPreview.vue
const PREVIEW_OPERATOR_PREFIX = 'FILTER.PREVIEW_OPERATOR_LABELS';

export const operatorPreviewLabel = (filterOperator: string): string => {
    const key = `${PREVIEW_OPERATOR_PREFIX}.${filterOperator}`;
    const translated = t(key);

    return translated === key ? replaceUnderscoreWithSpace(filterOperator) : translated;
};

// Tên thuộc tính lấy từ chính danh sách FilterType mà modal bộ lọc dùng, nên
// chip và modal luôn hiện cùng một tên (kể cả thuộc tính tùy biến).
export const attributePreviewLabel = (
    attributeKey: string,
    filterTypes: (FilterType | FilterSelectOption)[],
): string => {
    const filterType = filterTypes.find(
        (type): type is FilterType => 'attributeKey' in type && type.attributeKey === attributeKey,
    );

    return filterType?.attributeName || replaceUnderscoreWithSpace(attributeKey);
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
    filterTypes?: (FilterType | FilterSelectOption)[];
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
    filterTypes = [],
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
                            className="flex items-center h-full min-w-0 gap-1 px-2 py-1 text-xs rounded-lg bg-n-surface-field hover:bg-n-surface-field-hover max-w-72 hover:cursor-pointer"
                            onClick={onOpenFilter}
                        >
                            <span className="lowercase whitespace-nowrap first-letter:capitalize text-n-slate-12">
                                {attributePreviewLabel(filter.attributeKey, filterTypes)}
                            </span>
                            <span className="px-1 text-xs text-n-slate-10 whitespace-nowrap">
                                {operatorPreviewLabel(filter.filterOperator)}
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
                                {t(`FILTER.QUERY_DROPDOWN_LABELS.${filter.queryOperator.toUpperCase()}`)}
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
