import { useState } from 'react';

import type { UISettings } from 'dashboard/composables/useUISettings';
import { validateActions } from 'dashboard/settings/automation/validations';
import MacroNodes from './MacroNodes';
import MacroProperties from './MacroProperties';
import './macros.scss';
import type { MacroAction, MacroDraft, MacroOptionSets, MacroVisibility } from './types';

// Port từ settings/macros/MacroForm.vue. Vuelidate (name/visibility required)
// thành cờ nameError; validateActions dùng chung với Automation.
interface Props {
    macro: MacroDraft;
    optionSets: MacroOptionSets;
    uiSettings: UISettings;
    canManagePublicMacros?: boolean;
    readOnly?: boolean;
    onChange: (macro: MacroDraft) => void;
    onSubmit: (macro: MacroDraft) => void;
}

const removeKey = (errors: Record<string, string>, key: string): Record<string, string> =>
    Object.fromEntries(Object.entries(errors).filter(([name]) => name !== key));

export default function MacroForm({
    macro,
    optionSets,
    uiSettings,
    canManagePublicMacros = true,
    readOnly = false,
    onChange,
    onSubmit,
}: Props) {
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [nameTouched, setNameTouched] = useState(false);

    const updateActions = (actions: MacroAction[]) => onChange({ ...macro, actions });

    const appendNode = () =>
        updateActions([...macro.actions, { action_name: 'assign_team', action_params: [] }]);

    // Xoá lỗi của đúng index đó để node kế tiếp không bị đánh dấu sai.
    const deleteNode = (index: number) => {
        setErrors(current => removeKey(current, `action_${index}`));
        updateActions(macro.actions.filter((_, i) => i !== index));
    };

    // Chỉ xoá lỗi: việc xoá action_params khi đổi loại action do
    // AutomationActionInput làm trong cùng một lần cập nhật.
    const resetNode = (index: number) => setErrors(current => removeKey(current, `action_${index}`));

    const submit = () => {
        const actionErrors = validateActions(macro.actions) as Record<string, string>;
        setErrors(actionErrors);
        if (Object.keys(actionErrors).length !== 0) return;

        setNameTouched(true);
        if (!macro.name || !macro.visibility) return;

        onSubmit(macro);
    };

    return (
        <div className="flex flex-col w-full h-auto lg:flex-row lg:h-full">
            <div className="flex-1 w-full h-full max-h-full ltr:pl-12 ltr:pr-6 rtl:pl-6 rtl:pr-12 py-4 overflow-y-auto lg:w-auto macro-gradient-radial macro-gradient-radial-size">
                <div inert={readOnly ? true : undefined} className={readOnly ? 'opacity-75' : undefined}>
                    <MacroNodes
                        actions={macro.actions}
                        errors={errors}
                        optionSets={optionSets}
                        uiSettings={uiSettings}
                        onChange={updateActions}
                        onAddNewNode={appendNode}
                        onDeleteNode={deleteNode}
                        onResetAction={resetNode}
                    />
                </div>
            </div>
            <div className="w-full lg:w-1/3 pb-4">
                <MacroProperties
                    macroName={macro.name}
                    macroVisibility={macro.visibility}
                    nameError={nameTouched && !macro.name}
                    canManagePublicMacros={canManagePublicMacros}
                    readOnly={readOnly}
                    onNameChange={(name: string) => onChange({ ...macro, name })}
                    onVisibilityChange={(visibility: MacroVisibility) => onChange({ ...macro, visibility })}
                    onSubmit={submit}
                />
            </div>
        </div>
    );
}
