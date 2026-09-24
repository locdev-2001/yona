import { beforeEach, describe, expect, it } from 'vitest';

import { bubbleSVG, createBubbleIcon } from './bubbleHelpers';
import { isWidgetColorLighter } from './helpers/colorHelper';
import type { SdkInstance } from './types';

const stubSdkInstance = (overrides: Partial<SdkInstance>) => {
    window.$yona = { position: 'right', type: 'standard', ...overrides } as SdkInstance;
};

beforeEach(() => stubSdkInstance({}));

describe('createBubbleIcon', () => {
    it('gắn lớp vị trí phải cho bong bóng', () => {
        const target = createBubbleIcon({
            className: 'woot-widget-bubble',
            path: bubbleSVG,
            target: document.createElement('button'),
        });

        expect(target.className).toBe('woot-widget-bubble woot-elements--right');
        expect(target.title).toBe('Open chat window');
    });

    it('gắn lớp vị trí trái khi position = left', () => {
        stubSdkInstance({ position: 'left' });

        const target = createBubbleIcon({
            className: 'woot-widget-bubble',
            path: bubbleSVG,
            target: document.createElement('button'),
        });

        expect(target.className).toBe('woot-widget-bubble woot-elements--left');
    });

    it('thêm lớp expanded và ô chữ khi type = expanded_bubble', () => {
        stubSdkInstance({ type: 'expanded_bubble' });

        const target = createBubbleIcon({
            className: 'woot-widget-bubble',
            path: bubbleSVG,
            target: document.createElement('button'),
        });

        expect(target.className).toBe('woot-widget-bubble woot-elements--right woot-widget--expanded');
        expect(target.querySelector('#woot-widget--expanded__text')).not.toBeNull();
    });

    it('vẽ đúng icon SVG 24x24 viewBox 0 0 240 240', () => {
        const target = createBubbleIcon({
            className: 'woot-widget-bubble',
            path: bubbleSVG,
            target: document.createElement('button'),
        });
        const icon = target.querySelector('#woot-widget-bubble-icon');

        expect(icon?.getAttribute('width')).toBe('24');
        expect(icon?.getAttribute('height')).toBe('24');
        expect(icon?.getAttribute('viewBox')).toBe('0 0 240 240');
        expect(icon?.querySelector('path')?.getAttribute('d')).toBe(bubbleSVG);
    });
});

describe('isWidgetColorLighter', () => {
    it('màu mặc định #1f93ff là màu tối → chữ trắng', () => {
        expect(isWidgetColorLighter('#1f93ff')).toBe(false);
    });

    it('màu sáng vượt ngưỡng 225 → chữ đậm', () => {
        expect(isWidgetColorLighter('#ffffff')).toBe(true);
        expect(isWidgetColorLighter('#f2f3f7')).toBe(true);
    });
});

describe('formatUnreadBadge', () => {
    it('hiện đúng số tới 9, từ 10 tin thành 9+', async () => {
        const { formatUnreadBadge } = await import('./bubbleHelpers');
        expect(formatUnreadBadge(1)).toBe('1');
        expect(formatUnreadBadge(9)).toBe('9');
        expect(formatUnreadBadge(12)).toBe('9+');
    });
});
