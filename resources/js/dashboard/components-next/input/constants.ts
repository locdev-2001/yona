// Port từ dashboard/components-next/input/constants.js
export const DURATION_UNITS = {
    MINUTES: 'minutes',
    HOURS: 'hours',
    DAYS: 'days',
} as const;

export type DurationUnit = (typeof DURATION_UNITS)[keyof typeof DURATION_UNITS];
