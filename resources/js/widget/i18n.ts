import { t as translate } from '../i18n';

// Chuỗi widget sống ở lang/en/widget.php (§17 — một nguồn cho BE lẫn FE); bundle
// FE do `php artisan i18n:generate` sinh. Namespace WIDGET được thêm ở đây để
// call-site giữ nguyên tên khóa của bản gốc (`t('CHAT_PLACEHOLDER')`).
export function t(key: string, params?: Record<string, string | number>): string {
    return translate(`WIDGET.${key}`, params);
}
