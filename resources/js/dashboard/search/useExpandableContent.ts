import { useCallback, useEffect, useRef, useState } from 'react';

// Port từ shared/composables/useExpandableContent.js — phát hiện tràn dòng để
// bật "Read more / Read less".
interface ExpandableContentOptions {
    maxLines?: number;
    defaultLineHeight?: number;
    useResizeObserverForCheck?: boolean;
}

export function useExpandableContent({
    maxLines = 2,
    defaultLineHeight = 20,
    useResizeObserverForCheck = false,
}: ExpandableContentOptions = {}) {
    const contentElement = useRef<HTMLDivElement>(null);
    const [isExpanded, setExpanded] = useState(false);
    const [needsToggle, setNeedsToggle] = useState(false);

    const checkOverflow = useCallback(() => {
        const element = contentElement.current;
        if (!element) return;

        const lineHeight = parseFloat(window.getComputedStyle(element).lineHeight) || defaultLineHeight;
        setNeedsToggle(element.scrollHeight > lineHeight * maxLines);
    }, [defaultLineHeight, maxLines]);

    useEffect(() => {
        if (!useResizeObserverForCheck) {
            checkOverflow();

            return undefined;
        }

        const element = contentElement.current;
        if (!element) return undefined;

        const observer = new ResizeObserver(checkOverflow);
        observer.observe(element);

        return () => observer.disconnect();
    }, [checkOverflow, useResizeObserverForCheck]);

    return {
        contentElement,
        isExpanded,
        needsToggle,
        showReadMore: needsToggle && !isExpanded,
        showReadLess: needsToggle && isExpanded,
        toggleExpanded: setExpanded,
        checkOverflow,
    };
}
