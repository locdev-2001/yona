import { resolveMacroActions } from 'dashboard/settings/macros/macroHelper';
import type { Macro, MacroOptionSets } from 'dashboard/settings/macros/types';
import { t } from '../../../i18n';

// Port từ conversation/Macros/MacroPreview.vue
interface Props {
    macro: Macro;
    optionSets: MacroOptionSets;
}

export default function MacroPreview({ macro, optionSets }: Props) {
    const resolvedMacro = resolveMacroActions(macro, optionSets);

    return (
        <div
            className="macro-preview absolute border border-n-weak max-h-[22.5rem] z-50 w-64 rounded-md bg-n-alpha-3 backdrop-blur-[100px] shadow-lg bottom-8 end-8 overflow-y-auto p-4 text-start"
        >
            <h6 className="mb-4 text-sm text-n-slate-12">{macro.name}</h6>
            {resolvedMacro.map((action, index) => (
                <div key={index} className={`relative ps-4 ${index === macro.actions.length - 1 ? '' : 'pb-2'}`}>
                    {index !== macro.actions.length - 1 ? (
                        <div className="top-[0.390625rem] absolute -bottom-1 start-0 w-px bg-n-slate-6" />
                    ) : null}
                    <div className="absolute -start-[0.21875rem] top-[0.2734375rem] w-2 h-2 rounded-full bg-n-solid-1 border-2 border-solid border-n-weak" />
                    <p className="mb-1 text-xs text-n-slate-11">{t(`MACROS.ACTIONS.${action.actionName}`)}</p>
                    <p className="text-n-slate-12 text-sm">{action.actionValue}</p>
                </div>
            ))}
        </div>
    );
}
