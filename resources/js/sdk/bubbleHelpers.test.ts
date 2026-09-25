import { beforeEach, describe, expect, it } from 'vitest';

import { bubbleSVG, createBubbleIcon } from './bubbleHelpers';
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
        expect(target.title).toBe('');
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

    it('vẽ bong bóng nét viền 24x24 của design, icon ẩn với trình đọc màn hình', () => {
        const target = createBubbleIcon({
            className: 'woot-widget-bubble',
            path: bubbleSVG,
            target: document.createElement('button'),
        });
        const icon = target.querySelector('#woot-widget-bubble-icon');

        expect(icon?.getAttribute('width')).toBe('24');
        expect(icon?.getAttribute('height')).toBe('24');
        expect(icon?.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(icon?.getAttribute('aria-hidden')).toBe('true');
        expect(icon?.querySelector('path')?.getAttribute('d')).toBe(bubbleSVG);
        expect(icon?.querySelector('path')?.getAttribute('fill')).toBe('none');
    });
});

describe('setLauncherLabels', () => {
    it('gắn nhãn đọc màn hình và tooltip theo câu chữ widget gửi sang', async () => {
        const { chatBubble, closeBubble, setLauncherLabels } = await import('./bubbleHelpers');

        setLauncherLabels({ openLabel: 'Mở trò chuyện', closeLabel: 'Thu nhỏ trò chuyện' });

        expect(chatBubble.getAttribute('aria-label')).toBe('Mở trò chuyện');
        expect(chatBubble.title).toBe('Mở trò chuyện');
        expect(closeBubble.getAttribute('aria-label')).toBe('Thu nhỏ trò chuyện');
    });

    it('giữ nhãn cũ khi widget đời trước chỉ gửi chữ của bong bóng mở rộng', async () => {
        const { chatBubble, setLauncherLabels } = await import('./bubbleHelpers');
        setLauncherLabels({ openLabel: 'Mở trò chuyện' });

        setLauncherLabels({});

        expect(chatBubble.getAttribute('aria-label')).toBe('Mở trò chuyện');
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
