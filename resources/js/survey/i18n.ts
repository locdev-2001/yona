import { t as translate } from '../i18n';

// Chuỗi trang khảo sát sống ở lang/en/survey.php (§17 — một nguồn cho BE lẫn FE);
// namespace SURVEY thêm ở đây để call-site giữ nguyên tên khóa của bản gốc.
export function t(key: string, params?: Record<string, string | number>): string {
    return translate(`SURVEY.${key}`, params);
}
