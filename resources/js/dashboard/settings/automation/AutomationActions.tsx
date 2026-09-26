import Button from 'dashboard/components-next/button/Button';
import type { FilterOption } from 'dashboard/components-next/filter/helper/filterHelper';
import AutomationActionInput from 'dashboard/components/widgets/AutomationActionInput';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { t } from '../../../i18n';
import { getActionIcon, AUTOMATION_ACTION_TYPES } from './constants';
import { showActionInput } from './automationHelper';
import type { AutomationAction } from './types';
import type { AutomationErrors } from './validations';

// Port từ settings/automation/components/AutomationActions.vue
interface Props {
    actions: AutomationAction[];
    errors: AutomationErrors;
    uiSettings: UISettings;
    getActionDropdownValues: (actionName: string) => FilterOption[];
    onActionsChange: (actions: AutomationAction[]) => void;
    onAppendAction: () => void;
    onRemoveAction: (index: number) => void;
    onResetAction: (index: number) => void;
}

const actionTypes = AUTOMATION_ACTION_TYPES.map(action => ({
    ...action,
    labelText: t(`AUTOMATION.ACTIONS.${action.label}`),
    icon: getActionIcon(action.key),
}));

export default function AutomationActions({ actions, errors, uiSettings, getActionDropdownValues, onActionsChange, onAppendAction, onRemoveAction, onResetAction }: Props) {
    const hasActionErrors = Object.keys(errors).some(key => key.startsWith('action_'));

    return (
        <section>
            <label>{t('AUTOMATION.ADD.FORM.ACTIONS.LABEL')}</label>
            <ul
                className={`grid p-3 list-none border-solid outline outline-1 rounded-xl -outline-offset-1 ${
                    hasActionErrors ? 'outline-n-ruby-5 bg-n-ruby-2/50' : 'outline-n-weak'
                }`}
            >
                {actions.map((action, index) => (
                    <AutomationActionInput
                        key={index}
                        action={action}
                        actionTypes={actionTypes}
                        dropdownValues={getActionDropdownValues(action.action_name)}
                        showActionInput={showActionInput(action.action_name)}
                        errorMessage={errors[`action_${index}`] ? t(`AUTOMATION.ERRORS.${String(errors[`action_${index}`])}`) : ''}
                        uiSettings={uiSettings}
                        editorId={`automation-action-${index}`}
                        onChange={next => onActionsChange(actions.map((item, itemIndex) => (itemIndex === index ? next : item)))}
                        onResetAction={() => onResetAction(index)}
                        onRemoveAction={() => onRemoveAction(index)}
                    />
                ))}
                <div className="pt-2">
                    <Button type="button" icon="i-lucide-plus" blue faded sm label={t('AUTOMATION.ADD.ACTION_BUTTON_LABEL')} onClick={onAppendAction} />
                </div>
            </ul>
        </section>
    );
}
