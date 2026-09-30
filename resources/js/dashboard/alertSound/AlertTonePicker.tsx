import { t } from '../../i18n';
import Button from 'dashboard/components-next/button/Button';
import SelectInput from 'dashboard/components-next/select/Select';
import { ALERT_TONES, alertToneLabelKey, type AlertTone } from 'shared/alertSound/alertTones';
import { previewAlertTone } from './alertPlayer';

interface AlertTonePickerProps {
    id?: string;
    value: AlertTone;
    disabled?: boolean;
    onChange: (tone: AlertTone) => void;
}

/** Chọn một trong các âm báo dùng chung + nút nghe thử. Dùng ở Hồ sơ và ở màn cấu hình Widget chat. */
export default function AlertTonePicker({ id, value, disabled = false, onChange }: AlertTonePickerProps) {
    return (
        <div className="flex items-center gap-2">
            <SelectInput
                id={id}
                aria-label={t('ALERT_SOUND.TONE_LABEL')}
                value={value}
                disabled={disabled}
                options={ALERT_TONES.map(tone => ({ value: tone, label: t(alertToneLabelKey(tone)) }))}
                onChange={onChange}
            />
            <Button
                type="button"
                variant="faded"
                color="slate"
                size="sm"
                icon="i-lucide-volume-2"
                label={t('ALERT_SOUND.PREVIEW')}
                disabled={disabled}
                onClick={() => previewAlertTone(value)}
            />
        </div>
    );
}
