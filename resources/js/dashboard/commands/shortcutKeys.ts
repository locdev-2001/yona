import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { settingsHomeUrl } from 'dashboard/settings/shell/settingsPages';

// Nguồn duy nhất của bộ phím tắt: modal "Phím tắt" đọc để hiển thị, phím di chuyển
// được gắn từ chính danh sách này (useSidebarKeyboardShortcuts). Chỉ liệt kê phím
// đang thật sự hoạt động.

// Phím trừu tượng; modal đổi sang ký hiệu theo hệ điều hành (⌘/⌥ trên Mac, Ctrl/Alt nơi khác).
export type ShortcutKey = 'mod' | 'alt' | 'shift' | 'enter' | 'esc' | 'up' | 'down' | (string & {});

export interface Shortcut {
    action: string;
    keys: ShortcutKey[];
}

export interface NavigationShortcut extends Shortcut {
    binding: string;
    url: (accountId: number) => string;
}

export const NAVIGATION_SHORTCUTS: NavigationShortcut[] = [
    { action: 'GO_TO_INBOX', keys: ['alt', 'C'], binding: 'Alt+KeyC', url: id => accountScopedUrl(id, 'dashboard') },
    { action: 'GO_TO_FRIENDS', keys: ['alt', 'V'], binding: 'Alt+KeyV', url: id => accountScopedUrl(id, 'contacts') },
    { action: 'GO_TO_SETTINGS', keys: ['alt', 'S'], binding: 'Alt+KeyS', url: settingsHomeUrl },
];

export interface ShortcutGroup {
    group: 'GENERAL' | 'NAVIGATION' | 'COMPOSER';
    shortcuts: Shortcut[];
}

// Ô soạn tin gửi bằng Enter hoặc ⌘/Ctrl+Enter tuỳ cài đặt của người dùng.
export function shortcutGroups(sendsWithEnter: boolean): ShortcutGroup[] {
    return [
        {
            group: 'GENERAL',
            shortcuts: [
                { action: 'COMMAND_BAR', keys: ['mod', 'K'] },
                { action: 'SHOW_SHORTCUTS', keys: ['mod', '/'] },
                { action: 'CLOSE', keys: ['esc'] },
            ],
        },
        { group: 'NAVIGATION', shortcuts: NAVIGATION_SHORTCUTS },
        {
            group: 'COMPOSER',
            shortcuts: [
                { action: 'SEND_MESSAGE', keys: sendsWithEnter ? ['enter'] : ['mod', 'enter'] },
                { action: 'NEW_LINE', keys: sendsWithEnter ? ['shift', 'enter'] : ['enter'] },
                { action: 'NAVIGATE_LIST', keys: ['up', 'down'] },
            ],
        },
    ];
}
