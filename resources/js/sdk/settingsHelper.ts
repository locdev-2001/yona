// Port: refs/chatwoot/app/javascript/sdk/settingsHelper.js
import { BUBBLE_DESIGN, DARK_MODE, WIDGET_DESIGN } from './constants/design';
import type { BubbleDesign, DarkMode, WidgetDesign } from './constants/design';

export const getBubbleView = (type?: string): BubbleDesign =>
    BUBBLE_DESIGN.includes(type as BubbleDesign) ? (type as BubbleDesign) : BUBBLE_DESIGN[0];

export const isExpandedView = (type?: string): boolean => getBubbleView(type) === BUBBLE_DESIGN[1];

export const getWidgetStyle = (style?: string): WidgetDesign =>
    WIDGET_DESIGN.includes(style as WidgetDesign) ? (style as WidgetDesign) : WIDGET_DESIGN[0];

export const isFlatWidgetStyle = (style?: string): boolean => style === 'flat';

export const getDarkMode = (darkMode?: string): DarkMode =>
    DARK_MODE.includes(darkMode as DarkMode) ? (darkMode as DarkMode) : DARK_MODE[0];
