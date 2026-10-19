import { useCallback, useEffect, useState } from 'react';

// Bề rộng thật của một phần tử, theo dõi bằng ResizeObserver. Ref dạng callback nên
// phần tử gắn muộn (render sau khi có dữ liệu) vẫn được theo dõi. 0 = chưa đo.
export function useObservedWidth<T extends HTMLElement>(): [(element: T | null) => void, number] {
    const [element, setElement] = useState<T | null>(null);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!element || typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
        observer.observe(element);

        return () => observer.disconnect();
    }, [element]);

    return [useCallback((node: T | null) => setElement(node), []), width];
}
