import { useEffect, useRef, useState } from 'react';

import FilterSelect from 'dashboard/components-next/filter/inputs/FilterSelect';
import MultiSelect from 'dashboard/components-next/filter/inputs/MultiSelect';
import type { FilterOption } from 'dashboard/components-next/filter/helper/filterHelper';
import DurationInput from 'dashboard/components-next/input/DurationInput';
import { DURATION_UNITS } from 'dashboard/components-next/input/constants';
import type { DurationUnit } from 'dashboard/components-next/input/constants';
import Icon from 'dashboard/components-next/icon/Icon';
import { t } from '../../../i18n';
import { DEFAULT_TRIGGER, DEFAULT_TRIGGER_STATUS, DELAYED_TRIGGERS, MAX_DELAY_MINUTES, MIN_DELAY_MINUTES } from './constants';
import type { DelayedTrigger } from './constants';
import type { AutomationCondition } from './types';

// Port từ settings/automation/components/AutomationWaitCondition.vue — rule chạy
// sau chờ được diễn đạt bằng trigger + trạng thái + thời gian + inbox, rồi
// dịch ngược thành event_name + conditions cho API.
interface Props {
    eventName: string;
    conditions: AutomationCondition[];
    delay: number | null;
    unit: DurationUnit;
    statusOptions: Array<{ value: string; label: string }>;
    inboxOptions: FilterOption[];
    hasError?: boolean;
    isSavedWait?: boolean;
    onEventNameChange: (eventName: string) => void;
    onConditionsChange: (conditions: AutomationCondition[]) => void;
    onDelayChange: (delay: number | null) => void;
    onUnitChange: (unit: DurationUnit) => void;
}

const MINUTES_PER_UNIT: Record<DurationUnit, number> = {
    [DURATION_UNITS.MINUTES]: 1,
    [DURATION_UNITS.HOURS]: 60,
    [DURATION_UNITS.DAYS]: 24 * 60,
};

const rawConditionValue = (condition?: AutomationCondition): unknown => {
    const raw = Array.isArray(condition?.values) ? condition?.values[0] : condition?.values;
    return raw && typeof raw === 'object' ? (raw as FilterOption).id : raw;
};

const buildCondition = (attributeKey: string, values: unknown): AutomationCondition => ({
    attribute_key: attributeKey,
    filter_operator: 'equal_to',
    values,
    query_operator: 'and',
    custom_attribute_type: '',
});

const hydrate = (eventName: string, conditions: AutomationCondition[], inboxOptions: FilterOption[]) => {
    const conditionFor = (key: string) => conditions.find(condition => condition.attribute_key === key);
    const inboxIds = (Array.isArray(conditionFor('inbox_id')?.values) ? (conditionFor('inbox_id')?.values as unknown[]) : []).map(value =>
        value && typeof value === 'object' ? (value as FilterOption).id : value,
    );
    const inboxes = inboxOptions.filter(inbox => inboxIds.includes(inbox.id));

    let trigger: DelayedTrigger['key'] = DEFAULT_TRIGGER;
    let status = DEFAULT_TRIGGER_STATUS;
    const messageType = rawConditionValue(conditionFor('message_type'));
    if (eventName === 'message_created') {
        if (messageType === 'incoming') trigger = 'agent_unresponsive';
        else if (messageType === 'outgoing') trigger = 'customer_unresponsive';
    } else if (eventName === 'conversation_updated') {
        trigger = 'conversation_status';
        status = String(rawConditionValue(conditionFor('status')) ?? DEFAULT_TRIGGER_STATUS);
    }
    return { trigger, status, inboxes };
};

export default function AutomationWaitCondition({
    eventName,
    conditions,
    delay,
    unit,
    statusOptions,
    inboxOptions,
    hasError = false,
    isSavedWait = false,
    onEventNameChange,
    onConditionsChange,
    onDelayChange,
    onUnitChange,
}: Props) {
    const initial = useRef(hydrate(eventName, conditions, inboxOptions));
    const [selectedTrigger, setSelectedTrigger] = useState<DelayedTrigger['key']>(initial.current.trigger);
    const [triggerStatus, setTriggerStatus] = useState(initial.current.status);
    const [triggerInboxes, setTriggerInboxes] = useState<FilterOption[]>(initial.current.inboxes);
    const isFirstRender = useRef(true);

    const isStatusTrigger = selectedTrigger === 'conversation_status';
    const minDelay = Math.max(MIN_DELAY_MINUTES, MINUTES_PER_UNIT[unit]);

    const triggerOptions = DELAYED_TRIGGERS.map(trigger => ({
        value: trigger.key,
        label: t(`AUTOMATION.ADD.FORM.WAIT.OPTIONS.${trigger.key.toUpperCase()}`),
    }));

    const durationCount = Math.floor((delay ?? 0) / MINUTES_PER_UNIT[unit]);
    const durationLabel = t(`AUTOMATION.ADD.FORM.WAIT.DURATION.${unit.toUpperCase()}`, { count: durationCount, n: durationCount });
    const explanation = t(`AUTOMATION.ADD.FORM.WAIT.EXPLANATION.${selectedTrigger.toUpperCase()}`, { duration: durationLabel });

    // Rule chưa lưu dạng chờ vẫn mang điều kiện của editor tức thì (vd private note)
    // — không thể hiện ở đây nên áp trigger ngay khi mount; sau đó mỗi lần đổi
    // trigger/trạng thái/inbox thì dịch lại conditions.
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            if (isSavedWait) return;
        }
        const trigger = DELAYED_TRIGGERS.find(item => item.key === selectedTrigger) ?? DELAYED_TRIGGERS[0];
        onEventNameChange(trigger.eventName);
        const next: AutomationCondition[] = [
            trigger.messageType ? buildCondition('message_type', trigger.messageType) : buildCondition('status', triggerStatus),
        ];
        // Private note cũng là tin outgoing: thiếu dòng này, note nội bộ sẽ kích chờ "khách chưa trả lời".
        if (trigger.messageType === 'outgoing') next.push(buildCondition('private_note', [false]));
        if (triggerInboxes.length) next.push(buildCondition('inbox_id', triggerInboxes.map(inbox => inbox.id)));
        onConditionsChange(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTrigger, triggerStatus, triggerInboxes]);

    return (
        <div className="flex flex-col gap-2">
            <label className="mb-0">{t('AUTOMATION.ADD.FORM.WAIT.LABEL')}</label>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_17rem]">
                <div
                    className={`flex flex-col gap-3 p-4 outline outline-1 -outline-offset-1 rounded-xl ${
                        hasError ? 'outline-n-ruby-5 bg-n-ruby-2/50' : 'outline-n-weak'
                    }`}
                >
                    <div className="flex items-center gap-3 min-h-8">
                        <span className="text-sm w-20 shrink-0 text-n-slate-11">{t('AUTOMATION.ADD.FORM.WAIT.WHEN_LABEL')}</span>
                        <FilterSelect value={selectedTrigger} options={triggerOptions} onChange={value => setSelectedTrigger(value as DelayedTrigger['key'])} />
                    </div>
                    {isStatusTrigger ? (
                        <div className="flex items-center gap-3 min-h-8">
                            <span className="text-sm w-20 shrink-0 text-n-slate-11">{t('AUTOMATION.ADD.FORM.WAIT.STATUS_LABEL')}</span>
                            <FilterSelect value={triggerStatus} options={statusOptions} onChange={setTriggerStatus} />
                        </div>
                    ) : null}
                    <div className="flex items-center gap-3 min-h-8">
                        <span className="text-sm w-20 shrink-0 text-n-slate-11">{t('AUTOMATION.ADD.FORM.WAIT.FOR_LABEL')}</span>
                        <div className="flex items-center w-64 gap-2">
                            <DurationInput value={delay} unit={unit} min={minDelay} max={MAX_DELAY_MINUTES} onChange={onDelayChange} onUnitChange={onUnitChange} />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 min-h-8">
                        <span className="text-sm w-20 shrink-0 text-n-slate-11">{t('AUTOMATION.ADD.FORM.WAIT.INBOX_LABEL')}</span>
                        <MultiSelect value={triggerInboxes} options={inboxOptions} onChange={setTriggerInboxes} />
                    </div>
                </div>
                <aside className="flex flex-col gap-3 p-4 rounded-xl bg-n-alpha-1">
                    <Icon icon="i-lucide-info" className="text-n-slate-10" />
                    <p className="mb-0 text-xs text-n-slate-11">{explanation}</p>
                    <p className="mb-0 text-xs text-n-slate-11">{t('AUTOMATION.ADD.FORM.WAIT.FOOTNOTE')}</p>
                </aside>
            </div>
            {hasError ? <span className="text-xs text-n-ruby-9">{t('AUTOMATION.ADD.FORM.WAIT.ERROR')}</span> : null}
        </div>
    );
}
