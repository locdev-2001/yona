import { useEffect, useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import { t } from '../../../i18n';
import ConditionRow from './ConditionRow';
import type { ConversationFilterCondition, FilterSelectOption, FilterType } from './helper/filterHelper';
import { validateSingleFilter } from './helper/validations';

// Port từ components-next/filter/ContactsFilter.vue.
export const DEFAULT_CONTACT_FILTER: ConversationFilterCondition = {
    attributeKey: 'name',
    filterOperator: 'equal_to',
    values: '',
    queryOperator: 'and',
};

interface ContactsFilterProps {
    filters: ConversationFilterCondition[];
    attributeFilterTypes: (FilterType | FilterSelectOption)[];
    isSegmentView?: boolean;
    segmentName?: string;
    onChange: (filters: ConversationFilterCondition[]) => void;
    onApplyFilter: (filters: ConversationFilterCondition[]) => void;
    onUpdateSegment?: (filters: ConversationFilterCondition[], segmentName: string) => void;
    onClearFilters: () => void;
    onClose: () => void;
}

export default function ContactsFilter({
    filters,
    attributeFilterTypes,
    isSegmentView = false,
    segmentName = '',
    onChange,
    onApplyFilter,
    onUpdateSegment,
    onClearFilters,
    onClose,
}: ContactsFilterProps) {
    const [showErrors, setShowErrors] = useState(false);
    const [segmentNameLocal, setSegmentNameLocal] = useState(segmentName);
    const rootRef = useRef<HTMLDivElement>(null);

    // v-on-click-outside với ignore nút toggle (#toggleContactsFilterButton).
    useEffect(() => {
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (rootRef.current?.contains(target)) return;
            if (target.closest('#toggleContactsFilterButton')) return;
            onClose();
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [onClose]);

    useEffect(() => {
        setShowErrors(false);
    }, [filters]);

    const resetFilter = () => {
        onClearFilters();
        onChange([{ ...DEFAULT_CONTACT_FILTER }]);
    };

    const removeFilter = (index: number) => {
        if (filters.length === 1) {
            resetFilter();
        } else {
            onChange(filters.filter((_, filterIndex) => filterIndex !== index));
        }
    };

    const addFilter = () => onChange([...filters, { ...DEFAULT_CONTACT_FILTER }]);

    const updateFilter = (index: number, condition: ConversationFilterCondition) =>
        onChange(filters.map((filter, filterIndex) => (filterIndex === index ? condition : filter)));

    const isConditionsValid = () => {
        setShowErrors(true);
        return !filters.some(filter => validateSingleFilter(filter));
    };

    return (
        <div
            ref={rootRef}
            className="z-40 max-w-3xl min-w-96 lg:w-[750px] overflow-visible w-full border border-n-weak bg-n-alpha-3 backdrop-blur-[100px] shadow-lg rounded-xl p-6 grid gap-6"
        >
            <h3 className="text-base font-medium leading-6 text-n-slate-12">
                {isSegmentView ? t('CONTACTS_LAYOUT.FILTER.EDIT_SEGMENT') : t('CONTACTS_LAYOUT.FILTER.TITLE')}
            </h3>
            {isSegmentView ? (
                <div>
                    <div className="pb-6 border-b border-n-weak">
                        <Input
                            value={segmentNameLocal}
                            label={t('CONTACTS_LAYOUT.FILTER.SEGMENT.LABEL')}
                            placeholder={t('CONTACTS_LAYOUT.FILTER.SEGMENT.INPUT_PLACEHOLDER')}
                            onChange={event => setSegmentNameLocal(event.target.value)}
                        />
                    </div>
                </div>
            ) : null}
            <ul className="grid gap-4 list-none">
                {filters.map((filter, index) => (
                    <ConditionRow
                        key={`filter-${filter.attributeKey}-${index}`}
                        condition={filter}
                        filterTypes={attributeFilterTypes}
                        showQueryOperator={index > 0}
                        previousQueryOperator={index > 0 ? filters[index - 1].queryOperator : undefined}
                        showErrors={showErrors}
                        onChange={condition => updateFilter(index, condition)}
                        onQueryOperatorChange={queryOperator =>
                            updateFilter(index - 1, { ...filters[index - 1], queryOperator })
                        }
                        onRemove={() => removeFilter(index)}
                    />
                ))}
            </ul>
            <div className="flex justify-between gap-2">
                <Button sm ghost blue className="flex-shrink-0" onClick={addFilter}>
                    {t('CONTACTS_LAYOUT.FILTER.BUTTONS.ADD_FILTER')}
                </Button>
                <div className="flex gap-2 flex-shrink-0">
                    <Button sm faded slate onClick={resetFilter}>
                        {t('CONTACTS_LAYOUT.FILTER.BUTTONS.CLEAR_FILTERS')}
                    </Button>
                    {isSegmentView ? (
                        <Button
                            sm
                            solid
                            blue
                            disabled={!segmentNameLocal}
                            onClick={() => {
                                if (isConditionsValid()) onUpdateSegment?.(filters, segmentNameLocal);
                            }}
                        >
                            {t('CONTACTS_LAYOUT.FILTER.BUTTONS.UPDATE_SEGMENT')}
                        </Button>
                    ) : (
                        <Button
                            sm
                            solid
                            blue
                            onClick={() => {
                                if (isConditionsValid()) onApplyFilter(filters);
                            }}
                        >
                            {t('CONTACTS_LAYOUT.FILTER.BUTTONS.APPLY_FILTERS')}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
