// Port từ dashboard/constants/globals.js (phần đang dùng)
export const AVAILABILITY_STATUS_KEYS = ['online', 'busy', 'offline'] as const;

export type AvailabilityStatus = (typeof AVAILABILITY_STATUS_KEYS)[number];

export const SMALL_SCREEN_BREAKPOINT = 1024;
