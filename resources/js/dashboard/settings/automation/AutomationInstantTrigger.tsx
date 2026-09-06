import Button from 'dashboard/components-next/button/Button';
import ConditionRow from 'dashboard/components-next/filter/ConditionRow';
import type { ConversationFilterCondition, FilterType, FilterValue } from 'dashboard/components-next/filter/helper/filterHelper';
import { t } from '../../../i18n';
import type { AutomationCondition } from './types';
import type { AutomationErrors } from './validations';

// Port từ settings/automation/components/AutomationInstantTrigger.vue — event +
// danh sách điều kiện; hàng điều kiện dùng ConditionRow chung của bộ lọc.
interface Props {
    eventName: string;
    conditions: AutomationCondition[];
    events: Array<{ key: string; value: string }>;
    filterTypes: FilterType[];
    errors: AutomationErrors;
    showConditionErrors: boolean;
    showResetMessage: boolean;
    onEventChange: (eventName: string) => void;
    onConditionsChange: (conditions: AutomationCondition[]) => void;
    onAppendCondition: () => void;
    onRemoveCondition: (index: number) => void;
}

// ConditionRow nói camelCase (bộ lọc hội thoại), API automation nói snake_case —
// chuyển đổi tại ranh giới này để không nhân bản ConditionRow.
const toRowCondition = (condition: AutomationCondition): ConversationFilterCondition => ({
    attributeKey: condition.attribute_key,
    filterOperator: condition.filter_operator,
    values: condition.values as FilterValue,
    queryOperator: condition.query_operator ?? 'and',
});

export default function AutomationInstantTrigger({
    eventName,
    conditions,
    events,
    filterTypes,
    errors,
    showConditionErrors,
    showResetMessage,
    onEventChange,
    onConditionsChange,
    onAppendCondition,
    onRemoveCondition,
}: Props) {
    const hasConditionErrors = Object.keys(errors).some(key => key.startsWith('condition_'));

    const updateCondition = (index: number, row: ConversationFilterCondition) =>
        onConditionsChange(
            conditions.map((condition, itemIndex) =>
                itemIndex === index
                    ? { ...condition, attribute_key: row.attributeKey, filter_operator: row.filterOperator, values: row.values }
                    : condition,
            ),
        );

    const updateQueryOperator = (index: number, operator: 'and' | 'or') =>
        onConditionsChange(conditions.map((condition, itemIndex) => (itemIndex === index ? { ...condition, query_operator: operator } : condition)));

    return (
        <div className="flex flex-col gap-5">
            <div>
                <label className={errors.event_name ? 'error' : ''}>
                    {t('AUTOMATION.ADD.FORM.EVENT.LABEL')}
                    <select className="m-0" value={eventName} onChange={event => onEventChange(event.target.value)}>
                        {events.map(event => (
                            <option key={event.key} value={event.key}>
                                {event.value}
                            </option>
                        ))}
                    </select>
                    {errors.event_name ? <span className="message">{t('AUTOMATION.ADD.FORM.EVENT.ERROR')}</span> : null}
                </label>
                {showResetMessage ? <p className="pt-1 text-xs text-right text-n-teal-10">{t('AUTOMATION.FORM.RESET_MESSAGE')}</p> : null}
            </div>
            <section>
                <label>{t('AUTOMATION.ADD.FORM.CONDITIONS.LABEL')}</label>
                <ul
                    className={`grid gap-4 p-3 list-none outline outline-1 rounded-xl -outline-offset-1 ${
                        hasConditionErrors ? 'outline-n-ruby-5 bg-n-ruby-2/50' : 'outline-n-weak dark:outline-n-strong'
                    }`}
                >
                    {conditions.map((condition, index) => (
                        <ConditionRow
                            key={index}
                            condition={toRowCondition(condition)}
                            filterTypes={filterTypes}
                            showQueryOperator={index > 0}
                            previousQueryOperator={index > 0 ? conditions[index - 1].query_operator ?? 'and' : 'and'}
                            showErrors={showConditionErrors}
                            onChange={row => updateCondition(index, row)}
                            onQueryOperatorChange={operator => updateQueryOperator(index - 1, operator)}
                            onRemove={() => onRemoveCondition(index)}
                        />
                    ))}
                    <div>
                        <Button type="button" icon="i-lucide-plus" blue faded sm label={t('AUTOMATION.ADD.CONDITION_BUTTON_LABEL')} onClick={onAppendCondition} />
                    </div>
                </ul>
            </section>
        </div>
    );
}
