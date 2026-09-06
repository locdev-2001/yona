import { useCallback, useEffect, useMemo, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import SidePanel from 'dashboard/components-next/side-panel/SidePanel';
import { DropdownTeleportProvider } from 'dashboard/components-next/dropdown-menu/base';
import { DURATION_UNITS } from 'dashboard/components-next/input/constants';
import type { DurationUnit } from 'dashboard/components-next/input/constants';
import WootInput from 'dashboard/components/widgets/forms/Input';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { useAlert } from 'dashboard/composables/useAlert';
import { t } from '../../../i18n';
import AutomationActions from './AutomationActions';
import AutomationInstantTrigger from './AutomationInstantTrigger';
import AutomationRunTypeSelector from './AutomationRunTypeSelector';
import AutomationWaitCondition from './AutomationWaitCondition';
import { buildFilterTypes, formatAutomation, generateAutomationPayload, getActionDropdownValues, getConditionDropdownValues } from './automationHelper';
import type { AutomationPayload } from './automationHelper';
import { AUTOMATION_RULE_EVENTS, DEFAULT_DELAY_MINUTES, getDefaultActions, getDefaultConditions } from './constants';
import type { AutomationOptionSets, AutomationRule } from './types';
import { validateAutomation } from './validations';
import type { AutomationErrors } from './validations';

// Port từ settings/automation/AutomationRuleForm.vue + AddAutomationRule.vue +
// EditAutomationRule.vue (phần useAutomation: append/remove/reset/onEventChange).
interface Props {
    open: boolean;
    mode: 'create' | 'edit';
    rule: AutomationRule | null;
    // Tab "Runs after a wait" đang mở → form tạo mới bắt đầu ở chế độ chờ.
    initialExecutionDelay?: number | null;
    optionSets: AutomationOptionSets;
    allowsDelayedExecution: boolean;
    uiSettings: UISettings;
    onClose: () => void;
    onSave: (payload: AutomationPayload, mode: 'create' | 'edit') => Promise<void>;
}

type FormRule = Omit<AutomationRule, 'id' | 'account_id' | 'created_on' | 'active'> & Partial<Pick<AutomationRule, 'id' | 'account_id' | 'created_on' | 'active'>>;

const START_VALUE: FormRule = {
    name: null,
    description: null,
    event_name: 'conversation_created',
    execution_delay: null,
    conditions: getDefaultConditions('conversation_created'),
    actions: getDefaultActions(),
};

const unitForMinutes = (minutes: number): DurationUnit => {
    if (minutes % 1440 === 0) return DURATION_UNITS.DAYS;
    if (minutes % 60 === 0) return DURATION_UNITS.HOURS;
    return DURATION_UNITS.MINUTES;
};

export default function AutomationRuleForm({ open, mode, rule, initialExecutionDelay = null, optionSets, allowsDelayedExecution, uiSettings, onClose, onSave }: Props) {
    const isEditMode = mode === 'edit';
    const [automation, setAutomationState] = useState<FormRule>(START_VALUE);
    const [errors, setErrors] = useState<AutomationErrors>({});
    const [showConditionErrors, setShowConditionErrors] = useState(false);
    const [isSubmitting, setSubmitting] = useState(false);

    // Thời gian chờ nằm ở form (không ở khối chờ) để đổi qua lại run type không
    // làm mất số người dùng đã gõ.
    const [isDelayed, setDelayed] = useState(false);
    const [isSavedWait, setSavedWait] = useState(false);
    const [delayMinutes, setDelayMinutes] = useState<number | null>(DEFAULT_DELAY_MINUTES);
    const [delayUnit, setDelayUnit] = useState<DurationUnit>(DURATION_UNITS.HOURS);
    const [waitSectionKey, setWaitSectionKey] = useState(0);

    // Mọi thay đổi trên rule đang soạn xoá lỗi cũ (watch deep của gốc).
    const setAutomation = useCallback((updater: (current: FormRule) => FormRule) => {
        setAutomationState(updater);
        setErrors({});
    }, []);

    useEffect(() => {
        if (!open) return;
        const source: FormRule = rule ? formatAutomation(rule, optionSets) : structuredClone(START_VALUE);
        setAutomationState(source);
        setErrors({});
        setShowConditionErrors(false);

        const executionDelay = rule ? rule.execution_delay : initialExecutionDelay;
        setDelayed(Boolean(executionDelay));
        setSavedWait(isEditMode && Boolean(executionDelay));
        const minutes = executionDelay || DEFAULT_DELAY_MINUTES;
        setDelayUnit(unitForMinutes(minutes));
        setDelayMinutes(minutes);
        setWaitSectionKey(key => key + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!isDelayed) setSavedWait(false);
    }, [isDelayed]);

    const eventName = automation.event_name;
    const filterTypes = useMemo(() => buildFilterTypes(eventName, optionSets), [eventName, optionSets]);
    const events = useMemo(() => AUTOMATION_RULE_EVENTS.map(event => ({ ...event, value: t(`AUTOMATION.EVENTS.${event.value}`) })), []);
    const statusOptions = useMemo(
        () => getConditionDropdownValues('status', optionSets).filter(option => option.id !== 'all').map(option => ({ value: String(option.id), label: option.name })),
        [optionSets],
    );

    const hasAutomationMutated = Boolean(
        (automation.conditions[0]?.values && String(automation.conditions[0].values).length) || (automation.actions[0]?.action_params as unknown[])?.length,
    );

    const onEventChange = (nextEvent: string) =>
        setAutomation(current => ({ ...current, event_name: nextEvent, conditions: getDefaultConditions(nextEvent), actions: getDefaultActions() }));

    const appendNewCondition = () => setAutomation(current => ({ ...current, conditions: [...current.conditions, ...getDefaultConditions(current.event_name)] }));
    const appendNewAction = () => setAutomation(current => ({ ...current, actions: [...current.actions, ...getDefaultActions()] }));

    const removeFilter = (index: number) => {
        if (automation.conditions.length <= 1) {
            useAlert(t('AUTOMATION.CONDITION.DELETE_MESSAGE'));
            return;
        }
        setAutomation(current => ({ ...current, conditions: current.conditions.filter((_, itemIndex) => itemIndex !== index) }));
    };

    const removeAction = (index: number) => {
        if (automation.actions.length <= 1) {
            useAlert(t('AUTOMATION.ACTION.DELETE_MESSAGE'));
            return;
        }
        setAutomation(current => ({ ...current, actions: current.actions.filter((_, itemIndex) => itemIndex !== index) }));
    };

    // Xoá action_params khi đổi loại action nằm ở AutomationActionInput (nguồn duy nhất);
    // ở đây chỉ dọn lỗi của đúng node vừa đổi.
    const resetAction = (index: number) =>
        setErrors(current => Object.fromEntries(Object.entries(current).filter(([key]) => key !== `action_${index}`)));

    const submit = async () => {
        const nextErrors = validateAutomation(automation);
        const executionDelayInvalid = isDelayed && !Number.isFinite(delayMinutes);
        if (allowsDelayedExecution && executionDelayInvalid) nextErrors.execution_delay = true;
        setErrors(nextErrors);
        setShowConditionErrors(true);
        if (Object.keys(nextErrors).length > 0) return;

        const payload = generateAutomationPayload({ ...automation, execution_delay: isDelayed ? delayMinutes : null });
        // API từ chối param này khi feature tắt; giá trị cũ giữ nguyên phía server.
        if (!allowsDelayedExecution) delete payload.execution_delay;

        setSubmitting(true);
        try {
            await onSave(payload, mode);
        } catch {
            // Toast lỗi do Index sở hữu; giữ panel mở để người dùng sửa tiếp.
        } finally {
            setSubmitting(false);
        }
    };

    const titleKey = isEditMode ? 'AUTOMATION.EDIT.TITLE' : 'AUTOMATION.ADD.TITLE';
    const cancelKey = isEditMode ? 'AUTOMATION.EDIT.CANCEL_BUTTON_TEXT' : 'AUTOMATION.ADD.CANCEL_BUTTON_TEXT';
    const submitKey = isEditMode ? 'AUTOMATION.EDIT.SUBMIT' : 'AUTOMATION.ADD.SUBMIT';

    return (
        <SidePanel
            open={open}
            width="3xl"
            title={t(titleKey)}
            onClose={onClose}
            footer={
                <div className="flex flex-row justify-end w-full gap-2">
                    <Button faded slate type="button" label={t(cancelKey)} onClick={onClose} />
                    <Button solid blue type="button" isLoading={isSubmitting} label={t(submitKey)} onClick={() => void submit()} />
                </div>
            }
        >
            <DropdownTeleportProvider>
            <div className="flex flex-col w-full gap-6">
                <div className="flex flex-col">
                    <WootInput
                        label={t('AUTOMATION.ADD.FORM.NAME.LABEL')}
                        value={automation.name ?? ''}
                        className={errors.name ? 'error' : ''}
                        error={errors.name ? t('AUTOMATION.ADD.FORM.NAME.ERROR') : ''}
                        placeholder={t('AUTOMATION.ADD.FORM.NAME.PLACEHOLDER')}
                        onChange={value => setAutomation(current => ({ ...current, name: value }))}
                    />
                    <WootInput
                        label={t('AUTOMATION.ADD.FORM.DESC.LABEL')}
                        value={automation.description ?? ''}
                        className={errors.description ? 'error' : ''}
                        error={errors.description ? t('AUTOMATION.ADD.FORM.DESC.ERROR') : ''}
                        placeholder={t('AUTOMATION.ADD.FORM.DESC.PLACEHOLDER')}
                        onChange={value => setAutomation(current => ({ ...current, description: value }))}
                    />
                </div>
                {allowsDelayedExecution ? <AutomationRunTypeSelector isDelayed={isDelayed} onChange={setDelayed} /> : null}
                {isDelayed ? (
                    <AutomationWaitCondition
                        key={waitSectionKey}
                        eventName={automation.event_name}
                        conditions={automation.conditions}
                        delay={delayMinutes}
                        unit={delayUnit}
                        statusOptions={statusOptions}
                        inboxOptions={optionSets.inboxes}
                        isSavedWait={isSavedWait}
                        hasError={Boolean(errors.execution_delay)}
                        onEventNameChange={next => setAutomation(current => ({ ...current, event_name: next }))}
                        onConditionsChange={conditions => setAutomation(current => ({ ...current, conditions }))}
                        onDelayChange={setDelayMinutes}
                        onUnitChange={setDelayUnit}
                    />
                ) : (
                    <AutomationInstantTrigger
                        eventName={automation.event_name}
                        conditions={automation.conditions}
                        events={events}
                        filterTypes={filterTypes}
                        errors={errors}
                        showConditionErrors={showConditionErrors}
                        showResetMessage={!isEditMode && hasAutomationMutated}
                        onEventChange={onEventChange}
                        onConditionsChange={conditions => setAutomation(current => ({ ...current, conditions }))}
                        onAppendCondition={appendNewCondition}
                        onRemoveCondition={removeFilter}
                    />
                )}
                <AutomationActions
                    actions={automation.actions}
                    errors={errors}
                    uiSettings={uiSettings}
                    getActionDropdownValues={actionName => getActionDropdownValues(actionName, optionSets)}
                    onActionsChange={actions => setAutomation(current => ({ ...current, actions }))}
                    onAppendAction={appendNewAction}
                    onRemoveAction={removeAction}
                    onResetAction={resetAction}
                />
            </div>
            </DropdownTeleportProvider>
        </SidePanel>
    );
}
