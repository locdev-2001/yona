// Một múi giờ có thể mang nhiều tên. ICU (Chrome) giữ tên cũ Asia/Saigon trong
// Intl.supportedValuesOf, còn resolvedOptions() có thể trả tên hiện hành
// Asia/Ho_Chi_Minh; DB hộp thư cũ lưu 'UTC' trong khi danh sách chọn dùng 'Etc/UTC'.
// So khớp thẳng chuỗi sẽ trượt, nên mọi phép so khớp múi giờ đi qua bảng này.
const TIMEZONE_ALIAS_GROUPS: readonly (readonly string[])[] = [
    ['Asia/Ho_Chi_Minh', 'Asia/Saigon'],
    ['Etc/UTC', 'UTC'],
];

function aliasesOf(timezone: string): readonly string[] {
    return TIMEZONE_ALIAS_GROUPS.find(group => group.includes(timezone)) ?? [timezone];
}

// Tên mà `available` dùng cho múi giờ này (kể cả dưới bí danh); không có thì undefined.
export function matchTimezone(timezone: string, available: readonly string[]): string | undefined {
    return aliasesOf(timezone).find(alias => available.includes(alias));
}
