import { useEffect, useState } from 'react';

const hasDarkClass = () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

/**
 * Reactive resolved dark-mode flag. Tracks the `dark` class that use-appearance
 * toggles on <html>, so components can pick theme-aware values (e.g. canvas
 * colors) and update live when the user switches the theme switcher.
 */
export function useIsDark(): boolean {
    const [dark, setDark] = useState<boolean>(hasDarkClass);

    useEffect(() => {
        const observer = new MutationObserver(() => setDark(hasDarkClass()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        setDark(hasDarkClass());
        return () => observer.disconnect();
    }, []);

    return dark;
}
