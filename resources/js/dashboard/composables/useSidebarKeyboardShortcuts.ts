import { router } from '@inertiajs/react';

import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { useKeyboardEvents } from './useKeyboardEvents';

// Port từ components-next/sidebar/helpers/useSidebarKeyboardShortcuts.js.
// Router Vue → Inertia: so sánh `route.name` thay bằng so sánh đường dẫn hiện tại.

export function useSidebarKeyboardShortcuts(
    accountId: number,
    toggleShortcutModal: (show: boolean) => void,
): void {
    const navigateTo = (path: string) => {
        const url = accountScopedUrl(accountId, path);
        if (window.location.pathname !== url) router.visit(url);
    };

    useKeyboardEvents({
        '$mod+Slash': { action: () => toggleShortcutModal(true) },
        '$mod+Escape': { action: () => toggleShortcutModal(false) },
        'Alt+KeyC': { action: () => navigateTo('dashboard') },
        'Alt+KeyV': { action: () => navigateTo('contacts') },
        'Alt+KeyR': { action: () => navigateTo('reports/overview') },
        'Alt+KeyS': { action: () => navigateTo('settings/agents/list') },
    });
}
