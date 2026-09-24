export const BUBBLE_DESIGN = ['standard', 'expanded_bubble'] as const;
export const WIDGET_DESIGN = ['standard', 'flat'] as const;
export const DARK_MODE = ['light', 'auto', 'dark'] as const;

export type BubbleDesign = (typeof BUBBLE_DESIGN)[number];
export type WidgetDesign = (typeof WIDGET_DESIGN)[number];
export type DarkMode = (typeof DARK_MODE)[number];
