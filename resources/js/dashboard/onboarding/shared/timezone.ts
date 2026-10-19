import { matchTimezone } from 'shared/helpers/timezoneAliases';
import type { SelectOption } from './constants';

export const FALLBACK_TIMEZONE = 'Asia/Ho_Chi_Minh';

export function browserTimezone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
        return '';
    }
}

export function supportedTimezones(): string[] {
    try {
        return Intl.supportedValuesOf('timeZone');
    } catch {
        return [];
    }
}

// Danh sách luôn chứa giá trị mặc định: trình duyệt không có supportedValuesOf
// vẫn chọn được múi giờ của mình hoặc giờ Việt Nam.
export function timezoneOptions(available: readonly string[], browserZone: string): SelectOption[] {
    const zones = available.length ? available : [...new Set([browserZone, FALLBACK_TIMEZONE].filter(Boolean))];

    return zones.map(zone => ({ value: zone, label: zone.replace(/_/g, ' ') }));
}

// Múi giờ trình duyệt nếu có trong danh sách (kể cả dưới tên bí danh), không thì giờ Việt Nam.
export function defaultTimezone(options: readonly SelectOption[], browserZone: string): string {
    const available = options.map(option => option.value);

    return (
        (browserZone ? matchTimezone(browserZone, available) : undefined) ??
        matchTimezone(FALLBACK_TIMEZONE, available) ??
        ''
    );
}
