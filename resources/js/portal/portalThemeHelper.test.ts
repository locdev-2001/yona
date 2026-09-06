import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { adjustColorForContrast } from './colorContrast';
import {
    initializeMediaQueryListener,
    initializeTheme,
    initializeThemeHandlers,
    removeQueryParamsFromUrl,
    setPortalHoverColor,
    switchTheme,
    updateThemeInHeader,
} from './portalThemeHelper';
import type { PortalConfig } from './types';

// Port từ app/javascript/portal/specs/portalTheme.spec.js.
const portalConfig = (extra: Partial<PortalConfig> = {}) =>
    ({ portalColor: '#ff5733', ...extra }) as PortalConfig;

describe('portalThemeHelper', () => {
    let themeToggleButton: HTMLDivElement;
    let appearanceDropdown: HTMLDivElement;

    beforeEach(() => {
        themeToggleButton = document.createElement('div');
        themeToggleButton.id = 'toggle-appearance';
        document.body.appendChild(themeToggleButton);

        appearanceDropdown = document.createElement('div');
        appearanceDropdown.id = 'appearance-dropdown';
        appearanceDropdown.classList.add('appearance-menu');
        document.body.appendChild(appearanceDropdown);

        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: query === '(prefers-color-scheme: dark)',
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }));

        window.portalConfig = portalConfig();
        document.documentElement.style.setProperty = vi.fn();
        document.documentElement.classList.remove('dark', 'light');
        vi.clearAllMocks();
    });

    afterEach(() => {
        themeToggleButton.remove();
        appearanceDropdown.remove();
        document.documentElement.classList.remove('dark', 'light');
        localStorage.clear();
    });

    describe('setPortalHoverColor', () => {
        it('đặt màu hover cho theme tối', () => {
            setPortalHoverColor('dark');
            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--dynamic-hover-color',
                adjustColorForContrast('#ff5733', '#151718'),
            );
        });

        it('đặt màu hover cho theme sáng', () => {
            setPortalHoverColor('light');
            expect(document.documentElement.style.setProperty).toHaveBeenCalledWith(
                '--dynamic-hover-color',
                adjustColorForContrast('#ff5733', 'white'),
            );
        });
    });

    describe('removeQueryParamsFromUrl', () => {
        beforeEach(() => {
            window.history.replaceState = vi.fn();
        });

        it('không đụng URL khi không có tham số theme', () => {
            removeQueryParamsFromUrl();
            expect(window.history.replaceState).not.toHaveBeenCalled();
        });

        it('gỡ tham số theme khỏi URL', () => {
            window.history.pushState({}, '', '/?theme=light&show_plain_layout=true');
            removeQueryParamsFromUrl('theme');
            expect(window.history.replaceState).toHaveBeenCalledWith(
                {},
                '',
                `${window.location.origin}/?show_plain_layout=true`,
            );
        });
    });

    describe('updateThemeInHeader', () => {
        beforeEach(() => {
            themeToggleButton.innerHTML = `
                <div class="theme-button" data-theme="light"></div>
                <div class="theme-button" data-theme="dark"></div>
                <div class="theme-button" data-theme="system"></div>
            `;
        });

        it('hiện nút của theme đang chọn', () => {
            updateThemeInHeader('light');
            const lightButton = themeToggleButton.querySelector('.theme-button[data-theme="light"]');
            expect(lightButton?.classList.contains('flex')).toBe(true);
        });
    });

    describe('switchTheme', () => {
        it('theme hệ thống: không ghi localStorage, lấy theo prefers-color-scheme', () => {
            switchTheme('system');
            expect(localStorage.theme).toBeUndefined();
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });

        it('theme sáng', () => {
            switchTheme('light');
            expect(localStorage.theme).toBe('light');
            expect(document.documentElement.classList.contains('light')).toBe(true);
        });

        it('theme tối', () => {
            switchTheme('dark');
            expect(localStorage.theme).toBe('dark');
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });
    });

    describe('initializeThemeHandlers', () => {
        beforeEach(() => {
            appearanceDropdown.innerHTML = `
                <button data-theme="light"><span class="check-mark-icon light-theme"></span></button>
                <button data-theme="dark"><span class="check-mark-icon dark-theme"></span></button>
                <button data-theme="system"><span class="check-mark-icon system-theme"></span></button>
            `;
        });

        it('không nổ khi thiếu dropdown', () => {
            appearanceDropdown.remove();
            expect(() => initializeThemeHandlers()).not.toThrow();
        });

        it('bấm nút theme thì đổi theme', () => {
            initializeThemeHandlers();
            appearanceDropdown.querySelector<HTMLButtonElement>('button[data-theme="light"]')?.click();

            expect(localStorage.theme).toBe('light');
            expect(appearanceDropdown.dataset.currentTheme).toBe('light');
        });

        it('bấm nút toggle thì mở/đóng dropdown', () => {
            initializeThemeHandlers();
            expect(appearanceDropdown.dataset.dropdownOpen).toBeUndefined();

            themeToggleButton.click();
            expect(appearanceDropdown.dataset.dropdownOpen).toBe('true');

            themeToggleButton.click();
            expect(appearanceDropdown.dataset.dropdownOpen).toBe('false');
        });

        it('bấm ra ngoài thì đóng dropdown', () => {
            initializeThemeHandlers();
            appearanceDropdown.dataset.dropdownOpen = 'true';
            document.body.click();

            expect(appearanceDropdown.dataset.dropdownOpen).toBe('false');
        });
    });

    describe('initializeMediaQueryListener', () => {
        let mediaQuery: { addEventListener: ReturnType<typeof vi.fn>; matches: boolean };

        beforeEach(() => {
            mediaQuery = { addEventListener: vi.fn(), matches: false };
            window.matchMedia = vi.fn().mockReturnValue(mediaQuery);
        });

        it('đăng ký lắng nghe media query', () => {
            initializeMediaQueryListener();
            expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
            expect(mediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        });

        it('không đổi theme khi người dùng đã chọn light/dark', () => {
            localStorage.theme = 'light';
            initializeMediaQueryListener();
            mediaQuery.matches = true;
            mediaQuery.addEventListener.mock.calls[0][1]();
            expect(localStorage.theme).toBe('light');
        });

        it('đổi sang tối khi hệ thống đổi và chưa chọn theme', () => {
            localStorage.removeItem('theme');
            initializeMediaQueryListener();
            mediaQuery.matches = true;
            mediaQuery.addEventListener.mock.calls[0][1]();
            expect(document.documentElement.classList.contains('dark')).toBe(true);
        });
    });

    describe('initializeTheme', () => {
        it('bỏ qua khi đang ở bố cục nhúng (plain)', () => {
            window.portalConfig = portalConfig({ isPlainLayoutEnabled: 'true' });
            initializeTheme();
            expect(localStorage.theme).toBeUndefined();
            expect(document.documentElement.classList.contains('light')).toBe(false);
            expect(document.documentElement.classList.contains('dark')).toBe(false);
        });

        it('theo theme đã lưu trong localStorage', () => {
            localStorage.theme = 'light';
            initializeTheme();
            expect(localStorage.theme).toBe('light');
            expect(document.documentElement.classList.contains('light')).toBe(true);
        });
    });
});
