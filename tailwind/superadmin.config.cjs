// Console quản trị: utility Tailwind dựng từ đúng module graph của entry (surfaces.cjs),
// cộng bộ màu `console-*` đọc biến CSS khai ở resources/scss/_superadmin-auth-base.scss.
const surface = require('./surface.cjs')(require('./surfaces.cjs').superadmin.content);

const CONSOLE_COLOR_TOKENS = [
    'background',
    'foreground',
    'card',
    'muted',
    'muted-foreground',
    'accent',
    'accent-foreground',
    'border',
    'input',
    'ring',
    'primary',
    'primary-foreground',
    'brand',
    'destructive',
    'destructive-foreground',
    'success',
    'success-foreground',
    'warning',
    'warning-foreground',
    'sidebar',
    'overlay',
];

const consoleColors = Object.fromEntries(
    CONSOLE_COLOR_TOKENS.map(token => [token, `rgb(var(--console-${token}) / <alpha-value>)`]),
);

module.exports = {
    ...surface,
    theme: {
        ...surface.theme,
        extend: {
            ...surface.theme.extend,
            colors: { ...surface.theme.extend?.colors, console: consoleColors },
            keyframes: {
                ...surface.theme.extend?.keyframes,
                'console-slide-in': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
            },
            animation: {
                ...surface.theme.extend?.animation,
                'console-slide-in': 'console-slide-in 0.2s ease-out',
            },
        },
    },
};
