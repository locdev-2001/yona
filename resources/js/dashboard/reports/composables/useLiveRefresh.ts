import { useEffect, useRef } from 'react';

// Port từ dashboard/composables/useLiveRefresh.js — hẹn giờ tự gọi lại sau mỗi
// `interval`, dọn khi rời màn.
export function useLiveRefresh(callback: () => void | Promise<void>, interval = 60000): void {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;

        const schedule = () => {
            timeoutId = setTimeout(async () => {
                await callbackRef.current();
                schedule();
            }, interval);
        };

        schedule();
        return () => clearTimeout(timeoutId);
    }, [interval]);
}
