import { DEFAULT_ALERT_TONE, alertToneOrDefault, type AlertTone } from 'shared/alertSound/alertTones';
import type { UISettings } from 'dashboard/composables/useUISettings';

// `users.ui_settings.notification_sound` — máy chủ kiểm ở App\Support\AlertSound\AgentAlertPreference.
export const ALERT_PREFERENCE_UI_SETTINGS_KEY = 'notification_sound';

export const ALERT_SCOPES = ['all', 'assigned'] as const;

export type AlertScope = (typeof ALERT_SCOPES)[number];

export interface AgentAlertPreference {
    enabled: boolean;
    tone: AlertTone;
    /** `all`: mọi hội thoại mình thấy; `assigned`: chỉ hội thoại đang giao cho mình. */
    scope: AlertScope;
    /** Chỉ kêu khi không có tab Yona nào đang được mở trước mắt. */
    only_when_hidden: boolean;
}

export const DEFAULT_AGENT_ALERT_PREFERENCE: AgentAlertPreference = {
    enabled: true,
    tone: DEFAULT_ALERT_TONE,
    scope: 'all',
    only_when_hidden: false,
};

export function agentAlertPreferenceOf(uiSettings: UISettings | null | undefined): AgentAlertPreference {
    const stored = (uiSettings?.[ALERT_PREFERENCE_UI_SETTINGS_KEY] ?? {}) as Partial<AgentAlertPreference>;

    return {
        enabled: typeof stored.enabled === 'boolean' ? stored.enabled : DEFAULT_AGENT_ALERT_PREFERENCE.enabled,
        tone: alertToneOrDefault(stored.tone),
        scope: ALERT_SCOPES.includes(stored.scope as AlertScope) ? (stored.scope as AlertScope) : DEFAULT_AGENT_ALERT_PREFERENCE.scope,
        only_when_hidden:
            typeof stored.only_when_hidden === 'boolean' ? stored.only_when_hidden : DEFAULT_AGENT_ALERT_PREFERENCE.only_when_hidden,
    };
}
