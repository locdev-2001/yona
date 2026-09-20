import { afterEach, describe, expect, it, vi } from 'vitest';

import { isMacOS, isTouchOnlyDevice, modifierKeyLabel, shortcutLabel } from './kbd';

function stubPlatform(platform: string, userAgentDataPlatform?: string) {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
    Object.defineProperty(navigator, 'userAgentData', {
        configurable: true,
        value: userAgentDataPlatform ? { platform: userAgentDataPlatform } : undefined,
    });
}

afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(navigator, 'userAgentData');
});

describe('kbd', () => {
    it('nhận macOS qua userAgentData trước', () => {
        stubPlatform('Linux x86_64', 'macOS');
        expect(isMacOS()).toBe(true);
        expect(modifierKeyLabel()).toBe('⌘');
    });

    it('Linux/Windows hiện Ctrl chứ không phải ⌘', () => {
        stubPlatform('Linux x86_64', 'Linux');
        expect(isMacOS()).toBe(false);
        expect(modifierKeyLabel()).toBe('Ctrl');

        stubPlatform('Win32', 'Windows');
        expect(modifierKeyLabel()).toBe('Ctrl');
    });

    it('lùi về navigator.platform khi không có userAgentData', () => {
        stubPlatform('MacIntel');
        expect(isMacOS()).toBe(true);

        stubPlatform('Linux x86_64');
        expect(isMacOS()).toBe(false);
    });

    it('dựng nhãn tổ hợp phím theo hệ điều hành', () => {
        stubPlatform('MacIntel');
        expect(shortcutLabel(['$mod', '+', 'enter'])).toBe('⌘ + ↵');

        stubPlatform('Linux x86_64');
        expect(shortcutLabel(['$mod', '+', 'enter'])).toBe('CTRL + ↵');
    });
});

describe('isTouchOnlyDevice', () => {
    // jsdom không có window.matchMedia — cũng là lý do helper phải tự phòng thân.
    function stubHover(matches: boolean | null) {
        Object.defineProperty(window, 'matchMedia', {
            configurable: true,
            writable: true,
            value:
                matches === null
                    ? undefined
                    : (query: string) => ({ matches: query === '(hover: none)' && matches }) as MediaQueryList,
        });
    }

    afterEach(() => Reflect.deleteProperty(window, 'matchMedia'));

    it('máy cảm ứng (hover: none) → true, gợi ý phím tắt phải bị ẩn', () => {
        stubHover(true);
        expect(isTouchOnlyDevice()).toBe(true);
    });

    it('máy có chuột → false', () => {
        stubHover(false);
        expect(isTouchOnlyDevice()).toBe(false);
    });

    it('trình duyệt không có matchMedia → false, không nổ', () => {
        stubHover(null);
        expect(isTouchOnlyDevice()).toBe(false);
    });
});
