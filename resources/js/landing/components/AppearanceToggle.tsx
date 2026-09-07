import { useEffect, useRef, useState } from 'react';

import { getSelectedColorScheme, updateColorScheme, type ColorScheme } from 'dashboard/helper/themeHelper';

import type { LandingStrings } from '../config';

// Chuyển sáng/tối. Dùng lại `themeHelper` của dashboard thay vì tự quản lý:
// khoá localStorage `color_scheme` và lớp `dark` phải là MỘT nguồn duy nhất, nếu
// không khách chọn tối ở trang chủ rồi vào ứng dụng lại thấy nền sáng.
const OPTIONS: { scheme: ColorScheme; icon: string; labelKey: keyof LandingStrings['appearance'] }[] = [
    { scheme: 'light', icon: 'i-lucide-sun', labelKey: 'light' },
    { scheme: 'dark', icon: 'i-lucide-moon', labelKey: 'dark' },
    { scheme: 'auto', icon: 'i-lucide-monitor', labelKey: 'auto' },
];

export function AppearanceToggle({ strings, className = '' }: { strings: LandingStrings['appearance']; className?: string }) {
    const [scheme, setScheme] = useState<ColorScheme>('auto');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => setScheme(getSelectedColorScheme()), []);

    useEffect(() => {
        if (!open) return;

        const closeOnOutside = (event: MouseEvent | TouchEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', closeOnOutside);
        document.addEventListener('touchstart', closeOnOutside);
        document.addEventListener('keydown', closeOnEscape);

        return () => {
            document.removeEventListener('mousedown', closeOnOutside);
            document.removeEventListener('touchstart', closeOnOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    const pick = (next: ColorScheme) => {
        updateColorScheme(next);
        // themeHelper đặt lớp trên <body>; trang chủ tô màu theo <html> (blade đặt
        // sẵn trước khi vẽ để không chớp nền), nên đồng bộ cả hai.
        document.documentElement.classList.toggle('dark', document.body.classList.contains('dark'));
        setScheme(next);
        setOpen(false);
    };

    const active = OPTIONS.find((option) => option.scheme === scheme) ?? OPTIONS[2];

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                aria-label={strings.label}
                aria-expanded={open}
                aria-haspopup="menu"
                onClick={() => setOpen((value) => !value)}
                className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring focus-visible:ring-offset-canvas inline-flex size-9 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
                <span className={`${active.icon} size-4`} aria-hidden="true" />
            </button>

            {open ? (
                <div
                    role="menu"
                    className="border-border bg-card absolute end-0 top-full z-50 mt-2 min-w-36 rounded-lg border p-1 shadow-lg"
                >
                    {OPTIONS.map((option) => (
                        <button
                            key={option.scheme}
                            type="button"
                            role="menuitemradio"
                            aria-checked={option.scheme === scheme}
                            onClick={() => pick(option.scheme)}
                            className="hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
                        >
                            <span className={`${option.icon} size-4`} aria-hidden="true" />
                            <span className="flex-1 text-start">{strings[option.labelKey]}</span>
                            {option.scheme === scheme ? <span className="i-lucide-check size-4" aria-hidden="true" /> : null}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
