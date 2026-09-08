import { useEffect, useState } from 'react';

import { SMALL_SCREEN_BREAKPOINT } from 'dashboard/constants/globals';

// Nguồn duy nhất cho "màn hình rộng bao nhiêu" ở phía dashboard — thay cho
// `useWindowSize()` của @vueuse mà Chatwoot dùng. Mọi quyết định bố cục theo
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

export function isSmallScreen(viewportWidth: number): boolean {
    return viewportWidth > 0 && viewportWidth < SMALL_SCREEN_BREAKPOINT;
}

/** Khung nhìn hẹp hơn breakpoint `md` (768px) — điện thoại và tablet dọc nhỏ. */
export function useIsSmallScreen(): boolean {
    return isSmallScreen(useViewportWidth());
}
