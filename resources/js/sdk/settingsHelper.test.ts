import { describe, expect, it } from 'vitest';

import { getBubbleView, getDarkMode, getWidgetStyle, isExpandedView, isFlatWidgetStyle } from './settingsHelper';

describe('getBubbleView', () => {
    it('rơi về standard khi giá trị lạ', () => {
        expect(getBubbleView('')).toBe('standard');
        expect(getBubbleView('standard')).toBe('standard');
        expect(getBubbleView('expanded_bubble')).toBe('expanded_bubble');
    });
});

describe('isExpandedView', () => {
    it('chỉ đúng với expanded_bubble', () => {
        expect(isExpandedView('')).toBe(false);
        expect(isExpandedView('standard')).toBe(false);
        expect(isExpandedView('expanded_bubble')).toBe(true);
    });
});

describe('getWidgetStyle', () => {
    it('rơi về standard khi giá trị lạ', () => {
        expect(getWidgetStyle('')).toBe('standard');
        expect(getWidgetStyle('standard')).toBe('standard');
        expect(getWidgetStyle('flat')).toBe('flat');
    });
});

describe('isFlatWidgetStyle', () => {
    it('chỉ đúng với flat', () => {
        expect(isFlatWidgetStyle('')).toBe(false);
        expect(isFlatWidgetStyle('standard')).toBe(false);
        expect(isFlatWidgetStyle('flat')).toBe(true);
    });
});

describe('getDarkMode', () => {
    it('rơi về light khi giá trị lạ', () => {
        expect(getDarkMode('')).toBe('light');
        expect(getDarkMode('auto')).toBe('auto');
        expect(getDarkMode('dark')).toBe('dark');
    });
});
