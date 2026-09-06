import { t } from '../../../../../i18n';
import ActiveFilterPreview from 'dashboard/components-next/filter/ActiveFilterPreview';
import type { ConversationFilterCondition } from 'dashboard/components-next/filter/helper/filterHelper';
import { camelizeKeys } from 'dashboard/helper/transformKeys';
import type { CustomView } from 'dashboard/composables/useCustomViews';

// Port từ ContactsHeader/components/ContactsActiveFiltersPreview.vue.
interface ContactsActiveFiltersPreviewProps {
    activeSegment?: CustomView | null;
    appliedFilters?: ConversationFilterCondition[];
    className?: string;
    onClearFilters: () => void;
    onOpenFilter: () => void;
}

export default function ContactsActiveFiltersPreview({
    activeSegment = null,
    appliedFilters = [],
    className = '',
    onClearFilters,
    onOpenFilter,
}: ContactsActiveFiltersPreviewProps) {
    const hasActiveSegments = Boolean(activeSegment);
    const segmentConditions = (activeSegment?.query?.payload ?? []).map(filter => {
        const transformed = camelizeKeys<Record<string, unknown>>(filter);

        return {
            attributeKey: transformed.attributeKey,
            attributeModel: transformed.attributeModel,
            customAttributeType: transformed.customAttributeType,
            filterOperator: transformed.filterOperator,
            queryOperator: transformed.queryOperator ?? 'and',
            values: transformed.values,
        } as unknown as ConversationFilterCondition;
    });

    const activeFilterQueryData = hasActiveSegments ? segmentConditions : appliedFilters;

    return (
        <ActiveFilterPreview
            appliedFilters={activeFilterQueryData}
            maxVisibleFilters={2}
            moreFiltersLabel={t('CONTACTS_LAYOUT.FILTER.ACTIVE_FILTERS.MORE_FILTERS', {
                count: activeFilterQueryData.length - 2,
            })}
            clearButtonLabel={t('CONTACTS_LAYOUT.FILTER.ACTIVE_FILTERS.CLEAR_FILTERS')}
            showClearButton={!hasActiveSegments}
            className={`max-w-5xl ${className}`.trim()}
            onOpenFilter={onOpenFilter}
            onClearFilters={onClearFilters}
        />
    );
}
