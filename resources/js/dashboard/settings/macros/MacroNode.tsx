import Button from 'dashboard/components-next/button/Button';
import AutomationActionInput from 'dashboard/components/widgets/AutomationActionInput';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { t } from '../../../i18n';
import { getMacroDropdownValues, macroActionTypeOptions, showMacroActionInput } from './macroHelper';
import type { MacroAction, MacroOptionSets } from './types';

// Port từ settings/macros/MacroNode.vue — một node trong luồng macro.
interface Props {
    action: MacroAction;
    index: number;
    singleNode?: boolean;
    errorKey?: string;
    optionSets: MacroOptionSets;
    uiSettings: UISettings;
    onChange: (action: MacroAction) => void;
    onResetAction: () => void;
    onDeleteNode: () => void;
    onDragHandleDown: () => void;
    onDragHandleUp: () => void;
}

export default function MacroNode({
    action,
    index,
    singleNode = false,
    errorKey = '',
    optionSets,
    uiSettings,
    onChange,
    onResetAction,
    onDeleteNode,
    onDragHandleDown,
    onDragHandleUp,
}: Props) {
    const errorMessage = errorKey ? t(`MACROS.ERRORS.${errorKey}`) : '';
    const boxClass = errorKey ? 'animate-shake panel-invalid' : '';

    return (
        <div className="relative flex items-start w-full min-w-0 basis-full">
            {!singleNode ? (
                <Button
                    ghost
                    sm
                    slate
                    icon="i-lucide-menu"
                    className="absolute cursor-move ltr:-left-10 rtl:-right-10 ltr:mr-2 rtl:ml-2 macros__node-drag-handle"
                    onMouseDown={onDragHandleDown}
                    onMouseUp={onDragHandleUp}
                />
            ) : null}
            <div
                className={`flex-grow p-2 ltr:mr-2 rtl:ml-2 panel-surface rounded-lg ${boxClass}`}
            >
                <AutomationActionInput
                    action={action}
                    actionTypes={macroActionTypeOptions()}
                    dropdownValues={getMacroDropdownValues(action.action_name, optionSets)}
                    showActionInput={showMacroActionInput(action.action_name)}
                    isMacro
                    errorMessage={errorMessage}
                    uiSettings={uiSettings}
                    editorId={`macro_action_${index}`}
                    onChange={onChange}
                    onResetAction={onResetAction}
                    onRemoveAction={onDeleteNode}
                />
            </div>
            {!singleNode ? (
                <Button
                    title={t('MACROS.EDITOR.DELETE_BTN_TOOLTIP')}
                    icon="i-lucide-trash-2"
                    sm
                    faded
                    ruby
                    className="flex-shrink-0"
                    onClick={onDeleteNode}
                />
            ) : null}
        </div>
    );
}
