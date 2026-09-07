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

/** useKbd(['$mod', '+', 'enter']) của bản gốc → '⌘ + ↵' / 'CTRL + ↵'. */
export function shortcutLabel(keys: string[]): string {
    return keys
        .map(key => (key.toLowerCase() === '$mod' ? modifierKeyLabel() : (KEY_SYMBOLS[key.toLowerCase()] ?? key)))
        .join(' ')
        .toUpperCase();
}
