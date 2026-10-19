import { t } from '../../i18n';

const ONLINE_WINDOW_SECONDS = 120;

// "Đang hoạt động" / "Hoạt động 5 phút trước" từ lần hoạt động cuối (unix giây).
export function presenceLabel(lastSeenAt: number | null | undefined, now = Date.now() / 1000): string | null {
    if (!lastSeenAt) return null;
    const elapsed = Math.max(0, now - lastSeenAt);
    if (elapsed < ONLINE_WINDOW_SECONDS) return t('CHAT.PRESENCE.ONLINE');
    if (elapsed < 3600) return t('CHAT.PRESENCE.MINUTES', { count: Math.floor(elapsed / 60) });
    if (elapsed < 86400) return t('CHAT.PRESENCE.HOURS', { count: Math.floor(elapsed / 3600) });
    if (elapsed < 7 * 86400) return t('CHAT.PRESENCE.DAYS', { count: Math.floor(elapsed / 86400) });
    return null;
}
