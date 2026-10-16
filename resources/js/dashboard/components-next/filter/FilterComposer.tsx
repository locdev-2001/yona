import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import Input from 'dashboard/components-next/input/Input';
import FilterChip from 'dashboard/conversation/chatlist/FilterChip';
import { t } from '../../../i18n';
import { emptyValueFor, getFilterFromFilterTypes, getInputType, getOperator } from './ConditionRow';
import type { ConversationFilterCondition, FilterOption, FilterSelectOption, FilterType, FilterValue } from './helper/filterHelper';
import { selectableFilterTypes } from './helper/filterVisibility';
import { validateSingleFilter } from './helper/validations';

// Bộ lọc nâng cao dạng một cột: chọn thuộc tính, chọn giá trị, điều kiện thành chip.
// Không phụ thuộc loại danh sách (hội thoại, liên hệ): mọi thứ đến từ `filterTypes`.
type QueryOperator = ConversationFilterCondition['queryOperator'];

const SELECT_INPUTS = ['multiSelect', 'searchSelect', 'asyncSearchSelect', 'booleanSelect'];
const ROW = 'flex items-center gap-2 w-full min-h-9 max-md:min-h-11 px-2 rounded-md text-sm text-start text-n-slate-12 hover:bg-n-alpha-1 focus-visible:bg-n-alpha-1 outline-none';

const BOOLEAN_OPTIONS: FilterOption[] = [
    { id: true, name: t('FILTER.ATTRIBUTE_LABELS.TRUE') },
    { id: false, name: t('FILTER.ATTRIBUTE_LABELS.FALSE') },
];

const isAttribute = (filterType: FilterType | FilterSelectOption): filterType is FilterType => 'attributeKey' in filterType;

const selectedOptions = (values: FilterValue): FilterOption[] => {
    if (Array.isArray(values)) return values;
    if (values && typeof values === 'object' && 'id' in values) return [values as FilterOption];
    return [];
};

export function describeCondition(condition: ConversationFilterCondition, filterTypes: (FilterType | FilterSelectOption)[]) {
    const filterType = getFilterFromFilterTypes(filterTypes, condition.attributeKey);
    const operator = getOperator(filterType, condition.filterOperator);
    const attribute = filterType?.label ?? condition.attributeKey;
    if (!operator?.hasInput) return `${attribute}: ${operator?.label ?? ''}`;

    const options = selectedOptions(condition.values);
    const value = options.length ? options.map(option => option.name).join(', ') : String(condition.values ?? '');
    const isDefaultOperator = operator.value === filterType?.filterOperators[0]?.value;
    return isDefaultOperator ? `${attribute}: ${value}` : `${attribute} ${operator.label.toLowerCase()}: ${value}`;
}

const sharedQueryOperator = (conditions: ConversationFilterCondition[]): QueryOperator | null => {
    const operators = new Set(conditions.slice(0, -1).map(condition => condition.queryOperator));
    if (operators.size > 1) return null;
    return operators.values().next().value ?? 'and';
};

interface FilterComposerProps {
    filters: ConversationFilterCondition[];
    filterTypes: (FilterType | FilterSelectOption)[];
    onApply: (filters: ConversationFilterCondition[]) => void;
    onClose: () => void;
    // Trong bottom sheet: vỏ đã có tiêu đề và chạm nền mờ để đóng; không tự mở bàn phím.
    isSheet?: boolean;
}

export default function FilterComposer({ filters, filterTypes, onApply, onClose, isSheet = false }: FilterComposerProps) {
    const [conditions, setConditions] = useState(() => filters.filter(condition => !validateSingleFilter(condition)));
    const [editing, setEditing] = useState<{ index: number | null; condition: ConversationFilterCondition } | null>(null);

    const queryOperator = sharedQueryOperator(conditions);
    const setQueryOperator = (operator: QueryOperator) =>
        setConditions(current => current.map(condition => ({ ...condition, queryOperator: operator })));

    const startEditing = (attributeKey: string) => {
        const filterType = getFilterFromFilterTypes(filterTypes, attributeKey);
        const operator = filterType?.filterOperators[0];
        setEditing({
            index: null,
            condition: {
                attributeKey,
                filterOperator: operator?.value ?? 'equal_to',
                values: emptyValueFor(getInputType(operator, filterType)),
                queryOperator: queryOperator ?? 'and',
            },
        });
    };

    const saveEditing = (condition: ConversationFilterCondition) => {
        setConditions(current =>
            editing?.index === null || editing?.index === undefined
                ? [...current, condition]
                : current.map((item, index) => (index === editing.index ? condition : item)),
        );
        setEditing(null);
    };

    const removeCondition = (index: number) => setConditions(current => current.filter((_, itemIndex) => itemIndex !== index));

    if (editing) {
        return (
            <ConditionEditor
                autoFocus={!isSheet}
                condition={editing.condition}
                filterTypes={filterTypes}
                isNew={editing.index === null}
                onBack={() => setEditing(null)}
                onSave={saveEditing}
            />
        );
    }

    return (
        <div className="flex flex-col min-h-0 max-h-[inherit]">
            {isSheet ? (
                <div className="pt-1" />
            ) : (
                <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
                    <h3 className="m-0 text-sm font-medium text-n-slate-12">{t('FILTER.COMPOSER.TITLE')}</h3>
                    <Button xs ghost slate icon="i-lucide-x" aria-label={t('FILTER.CANCEL_BUTTON_LABEL')} onClick={onClose} />
                </div>
            )}

            {conditions.length ? (
                <div className="flex flex-col gap-2 px-3 pb-2">
                    <ul className="flex flex-wrap gap-1.5 m-0 p-0 list-none">
                        {conditions.map((condition, index) => (
                            <li key={`${condition.attributeKey}-${index}`} className="min-w-0 max-w-full">
                                <span className="inline-flex items-center max-w-full rounded-full border border-n-slate-6 text-xs text-n-slate-12">
                                    <button
                                        type="button"
                                        className="min-w-0 truncate py-1 ps-2.5 pe-1 outline-none focus-visible:underline"
                                        onClick={() => setEditing({ index, condition })}
                                    >
                                        {describeCondition(condition, filterTypes)}
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={t('FILTER.COMPOSER.REMOVE')}
                                        className="grid place-content-center size-6 max-md:size-8 shrink-0 rounded-full text-n-slate-11 hover:text-n-slate-12"
                                        onClick={() => removeCondition(index)}
                                    >
                                        <Icon icon="i-lucide-x" className="size-3" />
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                    {conditions.length > 1 ? (
                        <div className="flex gap-1.5" role="radiogroup" aria-label={t('FILTER.COMPOSER.MATCH')}>
                            {(['and', 'or'] as QueryOperator[]).map(operator => (
                                <FilterChip
                                    key={operator}
                                    role="radio"
                                    aria-checked={queryOperator === operator}
                                    isSelected={queryOperator === operator}
                                    onClick={() => setQueryOperator(operator)}
                                >
                                    {t(operator === 'and' ? 'FILTER.COMPOSER.MATCH_ALL' : 'FILTER.COMPOSER.MATCH_ANY')}
                                </FilterChip>
                            ))}
                        </div>
                    ) : null}
                </div>
            ) : (
                <p className="m-0 px-3 pb-2 text-xs text-n-slate-11">{t('FILTER.COMPOSER.EMPTY')}</p>
            )}

            <AttributePicker filterTypes={filterTypes} autoFocus={!isSheet} onPick={startEditing} />

            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-n-weak">
                <Button sm ghost slate disabled={!conditions.length} onClick={() => setConditions([])}>
                    {t('FILTER.COMPOSER.CLEAR')}
                </Button>
                <Button sm solid blue className="max-md:h-11" onClick={() => onApply(conditions)}>
                    {conditions.length
                        ? t('FILTER.COMPOSER.APPLY_COUNT', { count: conditions.length })
                        : t('FILTER.COMPOSER.APPLY')}
                </Button>
            </div>
        </div>
    );
}

function AttributePicker({
    filterTypes,
    autoFocus,
    onPick,
}: {
    filterTypes: (FilterType | FilterSelectOption)[];
    autoFocus: boolean;
    onPick: (key: string) => void;
}) {
    const [query, setQuery] = useState('');
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');

    const rows = useMemo(() => {
        const visible = selectableFilterTypes(filterTypes);
        if (!normalizedQuery) return visible;
        return visible.filter(filterType => isAttribute(filterType) && filterType.label.toLocaleLowerCase('vi').includes(normalizedQuery));
    }, [filterTypes, normalizedQuery]);

    return (
        <div className="flex flex-col min-h-0 border-t border-n-weak">
            <div className="px-3 pt-2 pb-1">
                <Input
                    value={query}
                    autoFocus={autoFocus}
                    placeholder={t('FILTER.COMPOSER.SEARCH_ATTRIBUTE')}
                    className="[&>input]:h-8 max-md:[&>input]:h-11"
                    onChange={event => setQuery(event.target.value)}
                />
            </div>
            <ul className="flex flex-col m-0 px-1 pb-1 list-none overflow-y-auto min-h-0 max-h-72 max-md:max-h-none">
                {rows.map(filterType =>
                    isAttribute(filterType) ? (
                        <li key={filterType.value}>
                            <button type="button" className={ROW} onClick={() => onPick(filterType.attributeKey)}>
                                <span className="grid place-content-center size-4 shrink-0 text-n-slate-11">
                                    {typeof filterType.icon === 'string' ? <Icon icon={filterType.icon} className="size-4" /> : filterType.icon}
                                </span>
                                <span className="flex-1 min-w-0 truncate">{filterType.label}</span>
                                <Icon icon="i-lucide-chevron-right" className="size-3.5 shrink-0 text-n-slate-10" />
                            </button>
                        </li>
                    ) : (
                        <li key={filterType.value} className="px-2 pt-2 pb-1 text-xs text-n-slate-11">
                            {filterType.label}
                        </li>
                    ),
                )}
                {!rows.some(isAttribute) ? (
                    <li className="px-2 py-3 text-xs text-n-slate-11">{t('FILTER.COMPOSER.NO_MATCH')}</li>
                ) : null}
            </ul>
        </div>
    );
}

interface ConditionEditorProps {
    autoFocus: boolean;
    condition: ConversationFilterCondition;
    filterTypes: (FilterType | FilterSelectOption)[];
    isNew: boolean;
    onBack: () => void;
    onSave: (condition: ConversationFilterCondition) => void;
}

function ConditionEditor({ autoFocus, condition: initialCondition, filterTypes, isNew, onBack, onSave }: ConditionEditorProps) {
    const [condition, setCondition] = useState(initialCondition);
    const filterType = getFilterFromFilterTypes(filterTypes, condition.attributeKey);
    const operator = getOperator(filterType, condition.filterOperator);
    const inputType = getInputType(operator, filterType);
    const isValid = !validateSingleFilter(condition);

    const changeOperator = (filterOperator: string) => {
        const nextOperator = getOperator(filterType, filterOperator);
        const nextInputType = getInputType(nextOperator, filterType);
        setCondition(current => ({
            ...current,
            filterOperator,
            values: nextInputType === inputType ? current.values : emptyValueFor(nextInputType),
        }));
    };

    let valueInput: ReactNode = null;
    if (operator?.hasInput && SELECT_INPUTS.includes(inputType)) {
        valueInput = (
            <OptionChecklist
                autoFocus={autoFocus}
                filterType={filterType}
                inputType={inputType}
                values={condition.values}
                onChange={values => setCondition(current => ({ ...current, values }))}
            />
        );
    } else if (operator?.hasInput) {
        valueInput = (
            <div className="px-3 pb-2">
                <Input
                    autoFocus={autoFocus}
                    type={inputType === 'date' ? 'date' : inputType === 'number' ? 'number' : 'text'}
                    value={typeof condition.values === 'string' || typeof condition.values === 'number' ? String(condition.values) : ''}
                    placeholder={t('FILTER.INPUT_PLACEHOLDER')}
                    className="[&>input]:h-9 max-md:[&>input]:h-11"
                    onChange={event => setCondition(current => ({ ...current, values: event.target.value }))}
                    onKeyDown={event => {
                        if (event.key === 'Enter' && isValid) onSave(condition);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-0 max-h-[inherit]">
            <div className="flex items-center gap-1 px-1.5 pt-2 pb-1">
                <Button xs ghost slate icon="i-lucide-chevron-left" aria-label={t('FILTER.COMPOSER.BACK')} onClick={onBack} />
                <h3 className="m-0 min-w-0 truncate text-sm font-medium text-n-slate-12">{filterType?.label}</h3>
            </div>
            {(filterType?.filterOperators.length ?? 0) > 1 ? (
                <div className="flex flex-wrap gap-1.5 px-3 pb-2" role="radiogroup" aria-label={t('FILTER.COMPOSER.OPERATOR')}>
                    {filterType?.filterOperators.map(option => (
                        <FilterChip
                            key={option.value}
                            role="radio"
                            aria-checked={option.value === operator?.value}
                            isSelected={option.value === operator?.value}
                            onClick={() => changeOperator(option.value)}
                        >
                            {option.label}
                        </FilterChip>
                    ))}
                </div>
            ) : null}
            {valueInput}
            <div className="flex justify-end gap-2 px-3 py-2 mt-auto border-t border-n-weak">
                <Button sm solid blue className="max-md:h-11" disabled={!isValid} onClick={() => onSave(condition)}>
                    {t(isNew ? 'FILTER.COMPOSER.ADD' : 'FILTER.COMPOSER.SAVE')}
                </Button>
            </div>
        </div>
    );
}

interface OptionChecklistProps {
    autoFocus: boolean;
    filterType: FilterType | undefined;
    inputType: string;
    values: FilterValue;
    onChange: (values: FilterValue) => void;
}

function OptionChecklist({ autoFocus, filterType, inputType, values, onChange }: OptionChecklistProps) {
    const [query, setQuery] = useState('');
    const [asyncOptions, setAsyncOptions] = useState<FilterOption[]>([]);
    const latestQuery = useRef('');
    const isMulti = inputType === 'multiSelect';
    const isAsync = inputType === 'asyncSearchSelect';
    const selected = selectedOptions(values);

    useEffect(() => {
        if (!isAsync) return undefined;
        latestQuery.current = query;
        if (!query.trim()) {
            setAsyncOptions([]);
            return undefined;
        }
        const timer = window.setTimeout(async () => {
            const results = await filterType?.searchOptions?.(query).catch(() => []);
            if (latestQuery.current === query) setAsyncOptions(results ?? []);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [filterType, isAsync, query]);

    const baseOptions = isAsync ? asyncOptions : inputType === 'booleanSelect' ? BOOLEAN_OPTIONS : (filterType?.options ?? []);
    const normalizedQuery = query.trim().toLocaleLowerCase('vi');
    const options = isAsync || !normalizedQuery
        ? baseOptions
        : baseOptions.filter(option => option.name.toLocaleLowerCase('vi').includes(normalizedQuery));
    const showSearch = isAsync || baseOptions.length > 6;

    const isSelected = (option: FilterOption) => selected.some(item => item.id === option.id);
    const toggle = (option: FilterOption) => {
        const { icon: _icon, ...plainOption } = option;
        if (!isMulti) {
            onChange(isSelected(option) ? {} : plainOption);
            return;
        }
        onChange(isSelected(option) ? selected.filter(item => item.id !== option.id) : [...selected, plainOption]);
    };

    return (
        <div className="flex flex-col min-h-0">
            {showSearch ? (
                <div className="px-3 pb-1">
                    <Input
                        autoFocus={autoFocus}
                        value={query}
                        placeholder={filterType?.searchPlaceholder ?? t('FILTER.COMPOSER.SEARCH_OPTION')}
                        className="[&>input]:h-8 max-md:[&>input]:h-11"
                        onChange={event => setQuery(event.target.value)}
                    />
                </div>
            ) : null}
            <ul className="flex flex-col m-0 px-1 pb-1 list-none overflow-y-auto min-h-0 max-h-64 max-md:max-h-none" role="listbox" aria-multiselectable={isMulti}>
                {options.map(option => (
                    <li key={String(option.id)}>
                        <button type="button" role="option" aria-selected={isSelected(option)} className={ROW} onClick={() => toggle(option)}>
                            {option.icon ? <span className="grid place-content-center size-4 shrink-0">{option.icon}</span> : null}
                            <span className="flex-1 min-w-0 truncate">{option.name}</span>
                            <Icon
                                icon="i-lucide-check"
                                className={`size-4 shrink-0 text-n-slate-12 ${isSelected(option) ? '' : 'invisible'}`}
                            />
                        </button>
                    </li>
                ))}
                {!options.length ? (
                    <li className="px-2 py-3 text-xs text-n-slate-11">
                        {t(isAsync && !query.trim() ? 'FILTER.COMPOSER.TYPE_TO_SEARCH' : 'FILTER.COMPOSER.NO_MATCH')}
                    </li>
                ) : null}
            </ul>
        </div>
    );
}
