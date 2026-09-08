// Port từ dashboard/constants/globals.js (phần đang dùng)
export const AVAILABILITY_STATUS_KEYS = ['online', 'busy', 'offline'] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUS_KEYS)[number];

// Hai ngưỡng bố cục của màn hội thoại — NGUỒN DUY NHẤT, mọi nơi khác đọc lại từ
// đây (quyết định founder 08/09/2026, ghi ở ux-deviations.md):
//   < 1024  : hai-màn — danh sách HOẶC khung chat, panel phải là lớp phủ
//   1024–1279: hai cột — danh sách + khung chat, panel phải vẫn là lớp phủ
//   >= 1280 : ba cột — panel phải là cột tĩnh, mở sẵn và nhớ lựa chọn
// Trùng `lg` và `xl` của Tailwind để lớp CSS `xl:` và nhánh JS luôn đổi cùng lúc.
export const SMALL_SCREEN_BREAKPOINT = 1024;

export const LARGE_SCREEN_BREAKPOINT = 1280;

export const SNOOZE_OPTIONS = {
    UNTIL_NEXT_REPLY: 'until_next_reply',
    AN_HOUR_FROM_NOW: 'an_hour_from_now',
    UNTIL_TOMORROW: 'until_tomorrow',
    UNTIL_NEXT_WEEK: 'until_next_week',
    UNTIL_NEXT_MONTH: 'until_next_month',
    UNTIL_CUSTOM_TIME: 'until_custom_time',
} as const;

export type SnoozeOption = (typeof SNOOZE_OPTIONS)[keyof typeof SNOOZE_OPTIONS];

export const EXAMPLE_WEBHOOK_URL = 'https://example/api/webhook';
