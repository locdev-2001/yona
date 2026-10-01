import { useEffect, useRef } from 'react';

// Ảnh hỏng vì mạng chập chờn hay server nghẽn thì thử lại khi mạng có lại hoặc
// agent quay lại tab, thay vì giữ ô lỗi tới lúc tải lại trang.
export function useRetryWhenBack(active: boolean, retry: () => void): void {
    const retryRef = useRef(retry);
    retryRef.current = retry;

    useEffect(() => {
        if (!active) return undefined;

        const onOnline = () => retryRef.current();
        const onVisible = () => {
            if (document.visibilityState === 'visible') retryRef.current();
        };

        window.addEventListener('online', onOnline);
        document.addEventListener('visibilitychange', onVisible);

        return () => {
            window.removeEventListener('online', onOnline);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [active]);
}
