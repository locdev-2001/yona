import { useEffect } from 'react';
import type { RefObject } from 'react';

// Thay directive `v-on-clickaway`: đóng popover khi bấm ra ngoài.
export function useClickAway(ref: RefObject<HTMLElement | null>, onClickAway: () => void, enabled = true): void {
    useEffect(() => {
        if (!enabled) return undefined;

        const handler = (event: MouseEvent) => {
            if (ref.current?.contains(event.target as Node)) return;
            onClickAway();
        };

        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    });
}
