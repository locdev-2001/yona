// Port từ dashboard/composables/utils/useKbd.js @ v4.17.1 — nguồn DUY NHẤT để
// hiển thị phím tắt theo hệ điều hành. Bản gốc còn hard-code '⌘' ở vài chỗ
// (FeaturePlaceholder.vue, ActionButtons.vue); ở đây mọi gợi ý phím đều đi qua
// helper này để người dùng Windows/Linux — phần lớn SME Việt — thấy đúng 'Ctrl'.

const KEY_SYMBOLS: Record<string, string> = {
    shift: '⇧',
    alt: '⌥',
    ctrl: 'Ctrl',
    cmd: '⌘',
    option: '⌥',
    enter: '↵',
    tab: '⇥',
    esc: '⎋',
};

export function isMacOS(): boolean {
    if (typeof navigator === 'undefined') return false;

    const platform = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform;
    if (platform) return platform === 'macOS';

    return navigator.platform.startsWith('Mac') || navigator.platform === 'iPhone';
}

/** Phím bổ trợ chính của hệ điều hành: '⌘' trên macOS, 'Ctrl' ở nơi khác. */
export function modifierKeyLabel(): string {
    return isMacOS() ? '⌘' : 'Ctrl';
}

// Nhãn một phím trừu tượng ('mod', 'alt', 'shift', 'enter', 'esc', 'up', 'down' hoặc ký tự)
// theo hệ điều hành, dùng cho chip phím <Kbd>.
export function keyLabel(key: string): string {
    const mac = isMacOS();
    const labels: Record<string, string> = {
        mod: mac ? '⌘' : 'Ctrl',
        alt: mac ? '⌥' : 'Alt',
        shift: mac ? '⇧' : 'Shift',
        enter: '↵',
        esc: 'Esc',
        up: '↑',
        down: '↓',
    };

    return labels[key.toLowerCase()] ?? key.toUpperCase();
}

/** useKbd(['$mod', '+', 'enter']) của bản gốc → '⌘ + ↵' / 'CTRL + ↵'. */
export function shortcutLabel(keys: string[]): string {
    return keys
        .map(key => (key.toLowerCase() === '$mod' ? modifierKeyLabel() : (KEY_SYMBOLS[key.toLowerCase()] ?? key)))
        .join(' ')
        .toUpperCase();
}

/**
 * Thiết bị chỉ có cảm ứng (không có con trỏ hover). Gợi ý phím tắt trên những
 * máy này là vô nghĩa — bàn phím ảo không có ⌘/Ctrl và không hiện Shift+Enter.
 * KHÁC BIỆT CỐ Ý so với bản gốc: gốc hiện nhãn phím tắt ở mọi thiết bị.
 */
export function isTouchOnlyDevice(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;

    return window.matchMedia('(hover: none)').matches;
}
