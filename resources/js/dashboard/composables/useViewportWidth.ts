import { useEffect, useState } from 'react';

import { LARGE_SCREEN_BREAKPOINT, PHONE_SCREEN_BREAKPOINT, SMALL_SCREEN_BREAKPOINT } from 'dashboard/constants/globals';

// Nguồn duy nhất cho "màn hình rộng bao nhiêu" ở phía dashboard — thay cho
// `useWindowSize()` của @vueuse. Mọi quyết định bố cục theo
// breakpoint (cột phải, hai-màn di động) đọc từ đây để chỉ có một chỗ lắng nghe
// `resize` và một định nghĩa ngưỡng.

function currentViewportWidth(): number {
    return typeof window === 'undefined' ? 0 : window.innerWidth;
}

export function useViewportWidth(): number {
    const [width, setWidth] = useState(currentViewportWidth);

    useEffect(() => {
        const onResize = () => setWidth(currentViewportWidth());
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return width;
}

/** Hẹp hơn `md` (768px) — điện thoại. */
export function isPhoneScreen(viewportWidth: number): boolean {
    return viewportWidth > 0 && viewportWidth < PHONE_SCREEN_BREAKPOINT;
}

export function useIsPhoneScreen(): boolean {
    return isPhoneScreen(useViewportWidth());
}

/** Hẹp hơn `lg` (1024px) — điện thoại và tablet dọc: bố cục hai-màn. */
export function isSmallScreen(viewportWidth: number): boolean {
    return viewportWidth > 0 && viewportWidth < SMALL_SCREEN_BREAKPOINT;
}

export function useIsSmallScreen(): boolean {
    return isSmallScreen(useViewportWidth());
}

/** Từ `xl` (1280px) trở lên — đủ chỗ dựng ba cột, panel phải thành cột tĩnh. */
export function isLargeScreen(viewportWidth: number): boolean {
    return viewportWidth >= LARGE_SCREEN_BREAKPOINT;
}

export function useIsLargeScreen(): boolean {
    return isLargeScreen(useViewportWidth());
}
