import type { ReactNode } from 'react';

import { t } from '../../../i18n';
import ToggleSwitch from 'dashboard/components-next/switch/Switch';
import SelectInput from 'dashboard/components-next/select/Select';
import AlertTonePicker from 'dashboard/alertSound/AlertTonePicker';
import { ALERT_SCOPES, type AgentAlertPreference, type AlertScope } from 'dashboard/alertSound/preference';
import { ICONS } from 'dashboard/icons';

const SCOPE_LABEL_KEYS: Record<AlertScope, string> = {
    all: 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.SCOPE_ALL',
    assigned: 'PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.SCOPE_ASSIGNED',
};

interface AlertSoundPreferencesProps {
    value: AgentAlertPreference;
    onChange: (preference: AgentAlertPreference) => void;
}

export function PreferenceRow({ label, htmlFor, note, children }: { label: string; htmlFor?: string; note?: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5 min-w-0">
                <label htmlFor={htmlFor} className="text-body-main text-n-slate-12">
                    {label}
                </label>
                {note ? <span className="text-label-small text-n-slate-11">{note}</span> : null}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

/** Âm báo khi khách nhắn tới — lưu ở ui_settings của nhân viên, áp cho mọi trình duyệt họ đăng nhập. */
export default function AlertSoundPreferences({ value, onChange }: AlertSoundPreferencesProps) {
    const update = (patch: Partial<AgentAlertPreference>) => onChange({ ...value, ...patch });

    return (
        <div id="profile-settings-alert-sound" className="panel-surface flex flex-col gap-4 p-4 rounded-xl">
            <div className="flex items-center justify-between w-full gap-2">
                <div className="flex flex-row items-start gap-2">
                    <span className={`${ICONS.notificationSound} size-[1.125rem] flex-shrink-0 mt-0.5 text-n-slate-12`} aria-hidden="true" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-body-main text-n-slate-12">{t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.TITLE')}</span>
                        <span className="text-label-small text-n-slate-11">
                            {t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.NOTE')}
                        </span>
                    </div>
                </div>
                <ToggleSwitch
                    value={value.enabled}
                    ariaLabel={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.TITLE')}
                    onChange={enabled => update({ enabled })}
                />
            </div>
            {value.enabled ? (
                <>
                    <PreferenceRow label={t('ALERT_SOUND.TONE_LABEL')} htmlFor="alert-sound-tone">
                        <AlertTonePicker id="alert-sound-tone" value={value.tone} onChange={tone => update({ tone })} />
                    </PreferenceRow>
                    <PreferenceRow label={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.SCOPE')} htmlFor="alert-sound-scope">
                        <SelectInput
                            id="alert-sound-scope"
                            value={value.scope}
                            options={ALERT_SCOPES.map(scope => ({ value: scope, label: t(SCOPE_LABEL_KEYS[scope]) }))}
                            onChange={scope => update({ scope: scope as AlertScope })}
                        />
                    </PreferenceRow>
                    <PreferenceRow
                        label={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.ONLY_WHEN_HIDDEN')}
                        note={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.ONLY_WHEN_HIDDEN_NOTE')}
                    >
                        <ToggleSwitch
                            value={value.only_when_hidden}
                            ariaLabel={t('PROFILE_SETTINGS.FORM.NOTIFICATIONS.SOUND.ONLY_WHEN_HIDDEN')}
                            onChange={onlyWhenHidden => update({ only_when_hidden: onlyWhenHidden })}
                        />
                    </PreferenceRow>
                </>
            ) : null}
        </div>
    );
}
