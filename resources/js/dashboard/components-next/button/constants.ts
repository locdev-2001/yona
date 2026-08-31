// Port từ dashboard/components-next/button/constants.js
export const VARIANT_OPTIONS = ['solid', 'outline', 'faded', 'link', 'ghost'] as const;
export const COLOR_OPTIONS = ['blue', 'ruby', 'amber', 'slate', 'teal'] as const;
export const SIZE_OPTIONS = ['xs', 'sm', 'md', 'lg'] as const;
export const JUSTIFY_OPTIONS = ['start', 'center', 'end'] as const;

export type ButtonVariant = (typeof VARIANT_OPTIONS)[number];
export type ButtonColor = (typeof COLOR_OPTIONS)[number];
export type ButtonSize = (typeof SIZE_OPTIONS)[number];
export type ButtonJustify = (typeof JUSTIFY_OPTIONS)[number];
