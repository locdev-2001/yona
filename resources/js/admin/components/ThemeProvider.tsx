import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { themeStyle, type PreviewTheme } from '../../superadmin/design-preview/tokens';

const storageKey = 'yona.admin.theme';
const ThemeContext = createContext({
    theme: 'light' as PreviewTheme,
    resolvedTheme: 'light' as PreviewTheme,
    setTheme: (_theme: string) => {},
});

export function ThemeProvider({ children }: { children: ReactNode; attribute?: string; defaultTheme?: string }) {
    const [theme, updateTheme] = useState<PreviewTheme>(() => {
        try {
            return localStorage.getItem(storageKey) === 'dark' ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    });
    useLayoutEffect(() => {
        const root = document.documentElement;
        root.dataset.adminPreview = '';
        root.dataset.theme = theme;
        root.classList.toggle('dark', theme === 'dark');
        Object.entries(themeStyle(theme)).forEach(([property, value]) => root.style.setProperty(property, String(value)));
        try {
            localStorage.setItem(storageKey, theme);
        } catch {}
    }, [theme]);
    return (
        <ThemeContext value={{ theme, resolvedTheme: theme, setTheme: value => updateTheme(value === 'dark' ? 'dark' : 'light') }}>
            {children}
        </ThemeContext>
    );
}

export const useTheme = () => useContext(ThemeContext);
