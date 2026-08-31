// Port từ dashboard/helper/themeHelper.js — class `dark` trên <body>,
// localStorage key `color_scheme`, 3 chế độ auto/light/dark.
export type ColorScheme = 'auto' | 'light' | 'dark';

const COLOR_SCHEME_KEY = 'color_scheme';

export function getSelectedColorScheme(): ColorScheme {
    try {
        const stored = JSON.parse(localStorage.getItem(COLOR_SCHEME_KEY) ?? '"auto"');
        return stored === 'light' || stored === 'dark' ? stored : 'auto';
    } catch {
        return 'auto';
    }
}

export function setColorTheme(isOSOnDarkMode: boolean): void {
    const selectedColorScheme = getSelectedColorScheme();
    if ((selectedColorScheme === 'auto' && isOSOnDarkMode) || selectedColorScheme === 'dark') {
        document.body.classList.add('dark');
        document.documentElement.style.setProperty('color-scheme', 'dark');
    } else {
        document.body.classList.remove('dark');
        document.documentElement.style.setProperty('color-scheme', 'light');
    }
}

export function updateColorScheme(scheme: ColorScheme): void {
    try {
        localStorage.setItem(COLOR_SCHEME_KEY, JSON.stringify(scheme));
    } catch {
        /* noop */
    }
    setColorTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);
}
