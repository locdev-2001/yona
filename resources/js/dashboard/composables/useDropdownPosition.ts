import { useCallback, useLayoutEffect, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';

// Port từ dashboard/composables/useDropdownPosition.js (chế độ fixed cho menu
// teleport ra body): ưu tiên dưới trigger, lật lên khi thiếu chỗ; align start/end
// tự đảo theo RTL; cập nhật khi cuộn/đổi cỡ cửa sổ.
const FALLBACK_SIZE = 200;
const SAFE_MARGIN = 16;
const GAP = 8;

interface Options {
    margin?: number;
    align?: 'start' | 'end';
}

export interface FixedPosition {
    className: string;
    style: CSSProperties;
}

export function useDropdownPosition(
    getTrigger: () => Element | null,
    dropdownRef: RefObject<HTMLElement | null>,
    enabled: boolean,
    { margin = SAFE_MARGIN, align = 'end' }: Options = {},
): FixedPosition {
    const [style, setStyle] = useState<CSSProperties>({});

    const compute = useCallback(() => {
        const trigger = getTrigger()?.getBoundingClientRect();
        if (!trigger) return;
        const dropdown = dropdownRef.current?.getBoundingClientRect();
        const dh = dropdown?.height || FALLBACK_SIZE;
        const dw = dropdown?.width || FALLBACK_SIZE;
        const winWidth = window.innerWidth;
        const winHeight = window.innerHeight;
        const isRTL = document.querySelector('#app[dir]')?.getAttribute('dir') === 'rtl';
        const anchorLeft = (align === 'start') !== isRTL;
        const next: CSSProperties = {};

        const spaceBelow = winHeight - trigger.bottom;
        const spaceAbove = trigger.top;
        const placeAbove = spaceBelow < dh + margin && (spaceAbove >= dh + margin || spaceAbove > spaceBelow);
        if (placeAbove) {
            next.bottom = `${winHeight - trigger.top + GAP}px`;
            next.maxHeight = `${spaceAbove - GAP - margin}px`;
        } else {
            next.top = `${trigger.bottom + GAP}px`;
            next.maxHeight = `${spaceBelow - GAP - margin}px`;
        }

        if (anchorLeft) {
            if (trigger.left + dw > winWidth - margin) next.right = `${margin}px`;
            else next.left = `${Math.max(margin, trigger.left)}px`;
        } else if (trigger.right - dw < margin) {
            next.left = `${margin}px`;
        } else {
            next.right = `${winWidth - trigger.right}px`;
        }
        setStyle(next);
    }, [getTrigger, dropdownRef, margin, align]);

    useLayoutEffect(() => {
        if (!enabled) return undefined;
        compute();
        window.addEventListener('resize', compute);
        window.addEventListener('scroll', compute, true);
        return () => {
            window.removeEventListener('resize', compute);
            window.removeEventListener('scroll', compute, true);
        };
    }, [enabled, compute]);

    return { className: 'fixed z-[9999]', style: enabled ? style : {} };
}
