import { afterEach, describe, expect, it, vi } from 'vitest';

import { isMacOS, modifierKeyLabel, shortcutLabel } from './kbd';

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
