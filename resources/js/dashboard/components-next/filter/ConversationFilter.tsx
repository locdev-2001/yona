import { useEffect, useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import { t } from '../../../i18n';
import ConditionRow from './ConditionRow';
import type { ConversationFilterCondition, FilterSelectOption, FilterType } from './helper/filterHelper';
import { validateSingleFilter } from './helper/validations';

// Port từ components-next/filter/ConversationFilter.vue (nhánh isFolderView =
// custom views E1 bỏ). Apply: validate mọi dòng rồi emit lên ChatList.
export const DEFAULT_FILTER: ConversationFilterCondition = {
    attributeKey: 'status',
    filterOperator: 'equal_to',
    values: [],
    queryOperator: 'and',
};

interface ConversationFilterProps {
    filters: ConversationFilterCondition[];
    attributeFilterTypes: (FilterType | FilterSelectOption)[];
    onChange: (filters: ConversationFilterCondition[]) => void;
    onApplyFilter: (filters: ConversationFilterCondition[]) => void;
    onClose: () => void;
}

export default function ConversationFilter({
    filters,
    attributeFilterTypes,
    onChange,
    onApplyFilter,
    onClose,
}: ConversationFilterProps) {
    const [showErrors, setShowErrors] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // v-on-click-outside với ignore nút toggle (#toggleConversationFilterButton).
    useEffect(() => {
        const onMouseDown = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (rootRef.current?.contains(target)) return;
            if (target.closest('#toggleConversationFilterButton')) return;
            onClose();
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [onClose]);

    useEffect(() => {
        setShowErrors(false);
    }, [filters]);

    const resetFilter = () => onChange([{ ...DEFAULT_FILTER }]);

    const removeFilter = (index: number) => {
        if (filters.length === 1) {
            resetFilter();
        } else {
            onChange(filters.filter((_, filterIndex) => filterIndex !== index));
        }
    };

    const addFilter = () => onChange([...filters, { ...DEFAULT_FILTER }]);

    const updateFilter = (index: number, condition: ConversationFilterCondition) =>
        onChange(filters.map((filter, filterIndex) => (filterIndex === index ? condition : filter)));

    const validateAndSubmit = () => {
        setShowErrors(true);
        if (filters.some(filter => validateSingleFilter(filter))) return;
        onApplyFilter(filters);
    };

    return (
        <div
            ref={rootRef}
            className="z-40 max-w-3xl lg:w-[750px] overflow-visible w-full border border-n-weak bg-n-alpha-3 backdrop-blur-[100px] shadow-lg rounded-xl p-6 grid gap-6"
        >
            <h3 className="text-base font-medium leading-6 text-n-slate-12">{t('FILTER.TITLE')}</h3>
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
            <div className="flex gap-2 justify-between">
                <Button sm ghost blue onClick={addFilter}>
                    {t('FILTER.ADD_NEW_FILTER')}
                </Button>
                <div className="flex gap-2">
                    <Button sm faded slate onClick={resetFilter}>
                        {t('FILTER.CLEAR_BUTTON_LABEL')}
                    </Button>
                    <Button sm solid blue onClick={validateAndSubmit}>
                        {t('FILTER.SUBMIT_BUTTON_LABEL')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
