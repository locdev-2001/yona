import type { SelectOption } from './constants';

export const FALLBACK_TIMEZONE = 'Asia/Ho_Chi_Minh';

// Cùng một múi giờ nhưng hai tên: ICU (Chrome) giữ tên cũ Asia/Saigon trong
// Intl.supportedValuesOf, trong khi resolvedOptions() có thể trả tên hiện hành
// Asia/Ho_Chi_Minh — so khớp trực tiếp sẽ trượt và ô múi giờ thành rỗng.
const TIMEZONE_ALIAS_GROUPS: readonly (readonly string[])[] = [['Asia/Ho_Chi_Minh', 'Asia/Saigon']];

function aliasesOf(timezone: string): readonly string[] {
    return TIMEZONE_ALIAS_GROUPS.find(group => group.includes(timezone)) ?? [timezone];
}

function matchingOption(timezone: string, available: readonly string[]): string | undefined {
    return aliasesOf(timezone).find(alias => available.includes(alias));
}

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
        (browserZone ? matchingOption(browserZone, available) : undefined) ??
        matchingOption(FALLBACK_TIMEZONE, available) ??
        ''
    );
}
