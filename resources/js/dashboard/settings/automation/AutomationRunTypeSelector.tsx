import RadioCard from 'dashboard/components-next/radioCard/RadioCard';
import { t } from '../../../i18n';

// Port từ settings/automation/components/AutomationRunTypeSelector.vue
interface Props {
    isDelayed: boolean;
    onChange: (isDelayed: boolean) => void;
}

const RUN_TYPES = [
    { id: 'automation_run_instantly', key: 'INSTANT', delayed: false },
    { id: 'automation_run_after_wait', key: 'WAIT', delayed: true },
];

export default function AutomationRunTypeSelector({ isDelayed, onChange }: Props) {
    return (
        <div className="flex flex-col gap-2">
            <label className="mb-0">{t('AUTOMATION.ADD.FORM.RUN_TYPE.LABEL')}</label>
            <div className="grid gap-3 sm:grid-cols-2">
                {RUN_TYPES.map(runType => (
                    <RadioCard
                        key={runType.id}
                        id={runType.id}
                        label={t(`AUTOMATION.ADD.FORM.RUN_TYPE.OPTIONS.${runType.key}.LABEL`)}
                        description={t(`AUTOMATION.ADD.FORM.RUN_TYPE.OPTIONS.${runType.key}.DESCRIPTION`)}
                        isActive={isDelayed === runType.delayed}
                        onSelect={id => onChange(RUN_TYPES.find(item => item.id === id)?.delayed ?? false)}
                    />
                ))}
            </div>
        </div>
    );
}
