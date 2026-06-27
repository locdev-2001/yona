import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY_PREFIX = 'announcement_modal_seen_';

/**
 * Manages the once-per-session display guard for the What's New modal.
 *
 * The modal is shown when:
 *   1. `latestId` is non-null (there is an unread announcement), AND
 *   2. sessionStorage does NOT have the key `announcement_modal_seen_<id>`.
 *
 * On dismiss, the key is written to sessionStorage so the modal does not
 * re-appear during the same browser session (even after workspace switches
 * or Inertia navigations). A new announcement (new id) re-triggers.
 */
export function useAnnouncementModal(latestId: string | null | undefined) {
    const storageKey = latestId ? `${STORAGE_KEY_PREFIX}${latestId}` : null;

    const [isOpen, setIsOpen] = useState<boolean>(() => {
        if (!storageKey) return false;
        try {
            return sessionStorage.getItem(storageKey) === null;
        } catch {
            // sessionStorage unavailable (e.g. private browsing / SSR guard)
            return false;
        }
    });

    // If latestId changes (e.g. new announcement published), re-evaluate.
    useEffect(() => {
        if (!storageKey) {
            setIsOpen(false);
            return;
        }
        try {
            setIsOpen(sessionStorage.getItem(storageKey) === null);
        } catch {
            setIsOpen(false);
        }
    }, [storageKey]);

    const close = useCallback(() => {
        if (storageKey) {
            try {
                sessionStorage.setItem(storageKey, '1');
            } catch {
                // best-effort; do not block dismiss
            }
        }
        setIsOpen(false);
    }, [storageKey]);

    return { isOpen, close };
}
