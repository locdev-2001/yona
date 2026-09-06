import { t } from '../../../i18n';
import Button from 'dashboard/components-next/button/Button';
import SearchContactAgentSelector from './SearchContactAgentSelector';
import SearchDateRangeSelector from './SearchDateRangeSelector';
import SearchInboxSelector from './SearchInboxSelector';
import { EMPTY_FILTERS } from '../helpers/searchHelper';
import type { SearchFilterState } from '../types';

// Port từ dashboard/modules/search/components/SearchFilters.vue.
interface SearchFiltersProps {
    filters: SearchFilterState;
    accountId: number;
    onUpdateFilters: (filters: SearchFilterState) => void;
}

export default function SearchFilters({ filters, accountId, onUpdateFilters }: SearchFiltersProps) {
    const hasActiveFilters = Boolean(
        filters.from || filters.in || filters.dateRange?.type || filters.dateRange?.from || filters.dateRange?.to,
    );

    const clearButton = (className: string) =>
        hasActiveFilters ? (
            <Button
                sm
                slate
                solid
                label={t('SEARCH.DATE_RANGE.CLEAR_FILTER')}
                icon="i-lucide-x"
                className={className}
                onClick={() => onUpdateFilters({ ...EMPTY_FILTERS, dateRange: { type: null, from: null, to: null } })}
            />
        ) : null;

    return (
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 p-4 w-full min-w-0">
            <div className="flex items-center gap-3 min-w-0 max-w-full">
                {clearButton('flex-shrink-0 lg:hidden')}
                <SearchDateRangeSelector
                    value={filters.dateRange}
                    className="min-w-0 max-w-full"
                    onChange={dateRange => onUpdateFilters({ ...filters, dateRange })}
                />
            </div>

            <div className="w-px h-4 bg-n-weak flex-shrink-0 hidden lg:block" />

            <div className="flex items-center gap-1.5 min-w-0 flex-1 max-w-full">
                <span className="text-sm text-n-slate-10 flex-shrink-0 whitespace-nowrap">
                    {t('SEARCH.FILTERS.FILTER_MESSAGE')}
                </span>

                <div className="min-w-0">
                    <SearchContactAgentSelector
                        label={t('SEARCH.FILTERS.FROM')}
                        accountId={accountId}
                        value={filters.from}
                        onChange={from => onUpdateFilters({ ...filters, from })}
                    />
                </div>

                <div className="w-px h-3 bg-n-weak rounded-lg flex-shrink-0" />

                <div className="min-w-0">
                    <SearchInboxSelector
                        label={t('SEARCH.FILTERS.IN')}
                        value={filters.in}
                        onChange={inboxId => onUpdateFilters({ ...filters, in: inboxId })}
                    />
                </div>
            </div>

            {clearButton('flex-shrink-0 hidden lg:inline-flex')}
        </div>
    );
}
