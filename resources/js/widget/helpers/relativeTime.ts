import { t } from '../i18n';

/** "vừa xong", "12 phút", "3 giờ", "Hôm qua", "18/09" — mốc thời gian gọn cho danh sách. */
export function relativeTime(unixSeconds: number | null | undefined, now: number = Date.now()): string {
    if (!unixSeconds) return '';

    const date = new Date(unixSeconds * 1000);
    const minutes = Math.floor((now - date.getTime()) / 60000);

    if (minutes < 1) return t('TIME.NOW');
    if (minutes < 60) return t('TIME.MINUTES', { n: minutes });

    const today = new Date(now);
    const sameDay = date.toDateString() === today.toDateString();
    if (sameDay) return t('TIME.HOURS', { n: Math.floor(minutes / 60) });

    const yesterday = new Date(now - 86400000);
    if (date.toDateString() === yesterday.toDateString()) return t('TIME.YESTERDAY');

    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}
