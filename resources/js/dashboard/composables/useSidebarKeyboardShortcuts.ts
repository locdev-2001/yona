import { router } from '@inertiajs/react';

import { NAVIGATION_SHORTCUTS } from 'dashboard/commands/shortcutKeys';
import { useKeyboardEvents } from './useKeyboardEvents';

// Phím mở modal Phím tắt và phím di chuyển giữa các màn (lấy từ shortcutKeys.ts).
export function useSidebarKeyboardShortcuts(
    accountId: number,
    toggleShortcutModal: (show: boolean) => void,
): void {
    const navigateTo = (url: string) => {
        if (window.location.pathname !== url) router.visit(url);
    };

    useKeyboardEvents({
        '$mod+Slash': { action: () => toggleShortcutModal(true) },
        '$mod+Escape': { action: () => toggleShortcutModal(false) },
        ...Object.fromEntries(
            NAVIGATION_SHORTCUTS.map(shortcut => [shortcut.binding, { action: () => navigateTo(shortcut.url(accountId)) }]),
        ),
    });
}
