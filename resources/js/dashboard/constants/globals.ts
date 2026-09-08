// Port từ dashboard/constants/globals.js (phần đang dùng)
export const AVAILABILITY_STATUS_KEYS = ['online', 'busy', 'offline'] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUS_KEYS)[number];

// Bằng breakpoint `md` của Tailwind — cùng ngưỡng mà CSS dùng để đổi cột phải
// từ lớp phủ sang cột tĩnh. Gốc: dashboard/constants/globals.js.
export const SMALL_SCREEN_BREAKPOINT = 768;

export const LARGE_SCREEN_BREAKPOINT = 1024;

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
