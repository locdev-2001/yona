import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Input from 'dashboard/components-next/input/Input';
import { t } from '../../../i18n';
import FilterSelect from './inputs/FilterSelect';
import MultiSelect from './inputs/MultiSelect';
import MultiTextInput from './inputs/MultiTextInput';
import SingleSelect from './inputs/SingleSelect';
import type { FilterOperator } from './operators';
import type { ConversationFilterCondition, FilterOption, FilterSelectOption, FilterType, FilterValue } from './helper/filterHelper';
import { validateSingleFilter } from './helper/validations';
import { selectableFilterTypes } from './helper/filterVisibility';

// Port từ components-next/filter/ConditionRow.vue.
interface ConditionRowProps {
    condition: ConversationFilterCondition;
    previousQueryOperator?: 'and' | 'or';
    showQueryOperator?: boolean;
    filterTypes: (FilterType | FilterSelectOption)[];
    showErrors: boolean;
    onChange: (condition: ConversationFilterCondition) => void;
    onQueryOperatorChange?: (operator: 'and' | 'or') => void;
    onRemove: () => void;
}

const getFilterFromFilterTypes = (filterTypes: (FilterType | FilterSelectOption)[], key: string): FilterType | undefined =>
    filterTypes.find((filterType): filterType is FilterType => 'attributeKey' in filterType && filterType.attributeKey === key);

const getOperator = (filter: FilterType | undefined, selectedOperator: string): FilterOperator | undefined =>
    filter?.filterOperators?.find(operator => operator.value === selectedOperator) ?? filter?.filterOperators?.[0];

const getInputType = (operator: FilterOperator | undefined, filter: FilterType | undefined): string =>
    operator?.inputOverride ?? filter?.inputType ?? 'plainText';

export function emptyValueFor(inputType: string): FilterValue {
    if (['multiSelect', 'multiText'].includes(inputType)) return [];
    if (['searchSelect', 'asyncSearchSelect', 'booleanSelect'].includes(inputType)) return {};
    return '';
}

export function resetConditionForAttribute(
    filterTypes: (FilterType | FilterSelectOption)[],
    condition: ConversationFilterCondition,
    attributeKey: string,
): ConversationFilterCondition {
    const filter = getFilterFromFilterTypes(filterTypes, attributeKey);
    const operator = getOperator(filter, condition.filterOperator);
    return {
        ...condition,
        attributeKey,
        filterOperator: operator?.value ?? condition.filterOperator,
        values: emptyValueFor(getInputType(operator, filter)),
    };
}

const queryOperatorOptions: FilterSelectOption[] = [
    {
        label: t('FILTER.QUERY_DROPDOWN_LABELS.AND'),
        value: 'and',
        icon: <span className="i-lucide-ampersands !text-n-blue-11" />,
    },
    {
        label: t('FILTER.QUERY_DROPDOWN_LABELS.OR'),
        value: 'or',
        icon: <span className="i-yona-logic-or !text-n-blue-11" />,
    },
];

const booleanOptions: FilterOption[] = [
    { id: true, name: t('FILTER.ATTRIBUTE_LABELS.TRUE') },
    { id: false, name: t('FILTER.ATTRIBUTE_LABELS.FALSE') },
];

const asSingle = (value: FilterValue): FilterOption | null =>
    value && typeof value === 'object' && !Array.isArray(value) && 'id' in value ? (value as FilterOption) : null;

export default function ConditionRow({
    condition,
    previousQueryOperator = 'and',
    showQueryOperator = false,
    filterTypes,
    showErrors,
    onChange,
    onQueryOperatorChange,
    onRemove,
}: ConditionRowProps) {
    const currentFilter = getFilterFromFilterTypes(filterTypes, condition.attributeKey);
    const currentOperator = getOperator(currentFilter, condition.filterOperator);
    const inputType = getInputType(currentOperator, currentFilter);
    const validationError = validateSingleFilter(condition);

    const [asyncOptions, setAsyncOptions] = useState<FilterOption[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const lastSearchQuery = useRef('');

    const searchTimer = useRef<number | undefined>(undefined);

    // debounce 300ms như gốc; bỏ qua kết quả cũ khi đã có query mới hơn.
    const performAsyncSearch = (query: string) => {
        window.clearTimeout(searchTimer.current);
        searchTimer.current = window.setTimeout(async () => {
            let results: FilterOption[] | null;
            try {
                results = (await currentFilter?.searchOptions?.(query)) ?? [];
            } catch {
                results = [];
            }
            if (query !== lastSearchQuery.current) return;
            if (results !== null) setAsyncOptions(results);
            setIsSearching(false);
        }, 300);
    };

    useEffect(() => {
        setAsyncOptions([]);
    }, [condition.attributeKey]);

    const onAsyncSearch = (query: string) => {
        const hasQuery = Boolean(query.trim());
        lastSearchQuery.current = query;
        if (!hasQuery) setAsyncOptions([]);
        setIsSearching(hasQuery);
        performAsyncSearch(query);
    };

    const setValues = (values: FilterValue) => onChange({ ...condition, values });

    const inputFieldType = inputType === 'date' ? 'date' : inputType === 'number' ? 'number' : 'text';

    const renderValueInput = (): ReactNode => {
        if (!currentOperator?.hasInput) return null;

        if (inputType === 'multiSelect') {
            return (
                <MultiSelect
                    value={Array.isArray(condition.values) ? condition.values : []}
                    options={currentFilter?.options ?? []}
                    onChange={setValues}
                    dropdownMaxHeight="max-h-72"
                />
            );
        }
        if (inputType === 'searchSelect') {
            return (
                <SingleSelect
                    value={asSingle(condition.values)}
                    options={currentFilter?.options ?? []}
                    onChange={value => setValues(value ?? {})}
                    dropdownMaxHeight="max-h-64"
                />
            );
        }
        if (inputType === 'asyncSearchSelect') {
            return (
                <SingleSelect
                    value={asSingle(condition.values)}
                    asyncSearch
                    options={asyncOptions}
                    isSearching={isSearching}
                    searchPlaceholder={currentFilter?.searchPlaceholder}
                    dropdownMaxHeight="max-h-64"
                    onChange={value => setValues(value ?? {})}
                    onSearch={onAsyncSearch}
                />
            );
        }
        if (inputType === 'booleanSelect') {
            return (
                <SingleSelect
                    value={asSingle(condition.values)}
                    disableSearch
                    options={booleanOptions}
                    onChange={value => setValues(value ?? {})}
                />
            );
        }
        if (inputType === 'multiText') {
            const textValues = Array.isArray(condition.values) ? condition.values.map(String) : [];
            return (
                <MultiTextInput
                    value={textValues}
                    placeholder={t(textValues.length ? 'FILTER.MULTI_VALUE_INPUT_PLACEHOLDER_SHORT' : 'FILTER.MULTI_VALUE_INPUT_PLACEHOLDER')}
                    // FilterValue của bộ lọc hội thoại chưa có string[]; multi_text chỉ automation dùng.
                    onChange={values => setValues(values as unknown as FilterValue)}
                />
            );
        }
        return (
            <Input
                value={typeof condition.values === 'string' || typeof condition.values === 'number' ? String(condition.values) : ''}
                type={inputFieldType}
                className="[&>input]:h-8 [&>input]:py-1.5 [&>input]:outline-offset-0"
                placeholder={t('FILTER.INPUT_PLACEHOLDER')}
                onChange={event => setValues(event.target.value)}
            />
        );
    };

    return (
        <li className="list-none">
            <div
                className={`flex gap-2 rounded-md ${showErrors && validationError ? 'animate-wiggle' : ''} ${
                    inputType === 'multiText' ? 'items-start' : 'items-center'
                }`}
            >
                {showQueryOperator ? (
                    <FilterSelect
                        value={previousQueryOperator}
                        onChange={value => onQueryOperatorChange?.(value as 'and' | 'or')}
                        variant="faded"
                        hideIcon
                        className="text-sm"
                        options={queryOperatorOptions}
                    />
                ) : null}
                <FilterSelect
                    value={condition.attributeKey}
                    variant="faded"
                    label={currentFilter?.label}
                    options={selectableFilterTypes(filterTypes).map(filterType => ({
                        value: filterType.value,
                        label: filterType.label,
                        icon: filterType.icon,
                        disabled: filterType.disabled,
                    }))}
                    onChange={attributeKey => onChange(resetConditionForAttribute(filterTypes, condition, attributeKey))}
                />
                <FilterSelect
                    value={condition.filterOperator}
                    variant="ghost"
                    options={(currentFilter?.filterOperators ?? []).map(operator => ({
                        value: operator.value,
                        label: operator.label,
                        icon: operator.icon,
                    }))}
                    onChange={filterOperator => onChange({ ...condition, filterOperator })}
                />
                {renderValueInput()}
                <Button
                    type="button"
                    sm
                    solid
                    slate
                    icon="i-lucide-trash"
                    className="flex-shrink-0"
                    onClick={event => {
                        event.stopPropagation();
                        onRemove();
                    }}
                />
            </div>
            {showErrors && validationError ? (
                <span className="text-sm text-n-ruby-11">{t(`FILTER.ERRORS.${validationError}`)}</span>
            ) : null}
        </li>
    );
}
