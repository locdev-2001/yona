// Port từ app/javascript/portal/portalThemeHelper.js.
import { adjustColorForContrast } from './colorContrast';

type PortalTheme = 'system' | 'light' | 'dark';

const resolveTheme = (theme: string): 'light' | 'dark' => {
    if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return theme === 'dark' ? 'dark' : 'light';
};

export function setPortalHoverColor(theme: string): void {
    const resolvedTheme = resolveTheme(theme);
    const portalColor = window.portalConfig.portalColor;
    const backgroundColor = resolvedTheme === 'dark' ? '#151718' : 'white';

    document.documentElement.style.setProperty(
        '--dynamic-hover-color',
        adjustColorForContrast(portalColor, backgroundColor),
    );
}

// Bỏ ?theme khỏi URL sau khi đã ghi vào localStorage, để lần sau không bị ép lại.
export function removeQueryParamsFromUrl(queryParam = 'theme'): void {
    const url = new URL(window.location.href);

    if (url.searchParams.get(queryParam)) {
        url.searchParams.delete(queryParam);
        window.history.replaceState({}, '', url.toString());
    }
}

export function updateThemeInHeader(theme: string): void {
    const themeToggleButton = document.getElementById('toggle-appearance');
    const allThemeButtons = themeToggleButton?.querySelectorAll<HTMLElement>('.theme-button');
    if (!allThemeButtons?.length) return;

    allThemeButtons.forEach(button => {
        const isActive = button.dataset.theme === theme;
        button.classList.toggle('hidden', !isActive);
        button.classList.toggle('flex', isActive);
    });
}

export function switchTheme(theme: PortalTheme | string): void {
    if (theme === 'system') {
        localStorage.removeItem('theme');
    } else {
        localStorage.theme = theme;
    }

    const resolvedTheme = resolveTheme(theme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(resolvedTheme);

    setPortalHoverColor(theme);
    updateThemeInHeader(theme);
    removeQueryParamsFromUrl();
    document.querySelectorAll<HTMLElement>('.appearance-menu').forEach(menu => {
        menu.dataset.currentTheme = theme;
    });
}

export function initializeThemeHandlers(): void {
    const toggle = document.getElementById('toggle-appearance');
    const dropdown = document.getElementById('appearance-dropdown');
    if (!toggle || !dropdown) return;

    toggle.addEventListener('click', event => {
        event.stopPropagation();
        dropdown.dataset.dropdownOpen = String(dropdown.dataset.dropdownOpen !== 'true');
    });

    document.addEventListener('click', ({ target }) => {
        const node = target as HTMLElement;
        if (toggle.contains(node)) return;

        const themeButton = node.closest<HTMLElement>('.appearance-menu button[data-theme]');
        const menu = themeButton?.closest<HTMLElement>('.appearance-menu');

        if (themeButton && menu) {
            switchTheme(themeButton.dataset.theme ?? 'system');
            menu.dataset.dropdownOpen = 'false';

            if (menu.id === 'mobile-appearance-dropdown') {
                setTimeout(() => {
                    const mobileToggle = document.getElementById('mobile-menu-toggle') as HTMLInputElement | null;
                    if (mobileToggle) mobileToggle.checked = false;
                }, 300);
            }

            return;
        }

        if (dropdown.dataset.dropdownOpen === 'true' && !dropdown.contains(node)) {
            dropdown.dataset.dropdownOpen = 'false';
        }
    });
}

export function initializeMediaQueryListener(): void {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (['light', 'dark'].includes(localStorage.theme)) return;

        switchTheme('system');
    });
}

export function initializeTheme(): void {
    if (window.portalConfig.isPlainLayoutEnabled === 'true') return;

    switchTheme(localStorage.theme || 'system');
    initializeThemeHandlers();
    initializeMediaQueryListener();
}
