import alertToneCatalog from './alertTones.json';

// Danh sách âm báo đọc từ alertTones.json — cùng tệp máy chủ dùng để kiểm hợp lệ
// (App\Support\AlertSound\AlertTones), nên thêm một âm chỉ cần thêm tệp mp3 và một dòng ở đó.
export const ALERT_TONES = alertToneCatalog.tones as readonly string[];

export type AlertTone = string;

export const DEFAULT_ALERT_TONE: AlertTone = alertToneCatalog.default;

const ALERT_TONE_DIRECTORY = '/audio/alerts';

export function isAlertTone(value: unknown): value is AlertTone {
    return typeof value === 'string' && ALERT_TONES.includes(value);
}

export function alertToneOrDefault(value: unknown): AlertTone {
    return isAlertTone(value) ? value : DEFAULT_ALERT_TONE;
}

export function alertToneUrl(tone: AlertTone, baseUrl = ''): string {
    return `${baseUrl}${ALERT_TONE_DIRECTORY}/${alertToneOrDefault(tone)}.mp3`;
}

export function alertToneLabelKey(tone: AlertTone): string {
    return `ALERT_SOUND.TONES.${tone.toUpperCase()}`;
}

/** `widget_settings.notification_sound` của hộp thư website (App\Support\Widget\WidgetSettings). */
export interface WidgetNotificationSound {
    enabled: boolean;
    tone: AlertTone;
}

export const DEFAULT_WIDGET_NOTIFICATION_SOUND: WidgetNotificationSound = { enabled: true, tone: DEFAULT_ALERT_TONE };
