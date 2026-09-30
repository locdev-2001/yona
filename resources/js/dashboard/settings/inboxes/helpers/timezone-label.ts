import { getLocale } from '../../../../i18n';
import type { TimeZoneOption } from './businessHour';

// Tên quen thuộc với người dùng Việt cho các múi giờ hay gặp; còn lại lấy từ Intl.
const VIETNAMESE_ZONE_NAMES: Record<string, string> = {
    'Asia/Ho_Chi_Minh': 'Hà Nội, TP. Hồ Chí Minh',
    'Asia/Saigon': 'Hà Nội, TP. Hồ Chí Minh',
    UTC: 'Giờ quốc tế (UTC)',
    'Etc/UTC': 'Giờ quốc tế (UTC)',
};

const intlLocale = (locale: string): string => locale.replace('_', '-');

const zonePart = (zone: string, locale: string, timeZoneName: 'longOffset' | 'longGeneric', at: Date): string | null => {
    try {
        const parts = new Intl.DateTimeFormat(intlLocale(locale), { timeZone: zone, timeZoneName }).formatToParts(at);

        return parts.find(part => part.type === 'timeZoneName')?.value ?? null;
    } catch {
        return null;
    }
};

/**
 * Độ lệch so với UTC của một múi giờ IANA tại thời điểm `at`, dạng "GMT+07:00".
 * Tính từ Intl nên đúng cả khi múi giờ có giờ mùa hè; trả null nếu tên không hợp lệ.
 */
export const timeZoneOffsetLabel = (zone: string, at: Date = new Date()): string | null => {
    const raw = zonePart(zone, 'en', 'longOffset', at);
    if (raw === null) return null;

    return raw === 'GMT' ? 'GMT+00:00' : raw.replace('−', '-');
};

/**
 * Nhãn hiển thị một múi giờ: "<tên theo ngôn ngữ> (GMT+07:00)". Tên lấy từ bảng Việt hoá
 * nếu có, không thì từ Intl theo ngôn ngữ giao diện kèm tên thành phố cuối của mã IANA
 * (nhiều múi giờ cùng tên chung, ví dụ cả châu Âu đều là "Giờ Trung Âu").
 */
export const timeZoneLabel = (zone: string, locale: string = getLocale(), at: Date = new Date()): string => {
    const offset = timeZoneOffsetLabel(zone, at);
    if (offset === null) return zone.replace(/_/g, ' ');

    const fixed = locale.startsWith('vi') ? VIETNAMESE_ZONE_NAMES[zone] : undefined;
    if (fixed) return `${fixed} (${offset})`;

    const city = zone.split('/').pop()!.replace(/_/g, ' ');
    const generic = zonePart(zone, locale, 'longGeneric', at);
    const name = generic && generic !== city ? `${city}, ${generic}` : city;

    return `${name} (${offset})`;
};

/** Gắn lại nhãn theo ngôn ngữ giao diện cho danh sách máy chủ cấp; giữ nguyên `value`. */
export const localizeTimeZoneOptions = (options: TimeZoneOption[], locale: string = getLocale()): TimeZoneOption[] => {
    const at = new Date();

    return options.map(option => ({ value: option.value, label: timeZoneLabel(option.value, locale, at) }));
};
