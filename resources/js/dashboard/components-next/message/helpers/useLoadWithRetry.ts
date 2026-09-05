import { useCallback, useRef, useState } from 'react';

// Port từ dashboard/composables/loadWithRetry.js — nạp ảnh, thử lại tối đa
// maxRetry lần với backoff tăng dần trước khi báo lỗi.
interface LoadWithRetryConfig {
    maxRetry?: number;
    backoff?: number;
}

export function useLoadWithRetry({ maxRetry = 3, backoff = 1000 }: LoadWithRetryConfig = {}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const configRef = useRef({ maxRetry, backoff });
    configRef.current = { maxRetry, backoff };

    const loadWithRetry = useCallback(async (url: string) => {
        const attemptLoad = () =>
            new Promise<void>((resolve, reject) => {
                const image = new Image();
                image.onload = () => {
                    setIsLoaded(true);
                    setHasError(false);
                    resolve();
                };
                image.onerror = () => reject(new Error('Failed to load image'));
                image.src = url;
            });

        const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        const retry = async (attempt = 0): Promise<void> => {
            try {
                await attemptLoad();
            } catch {
                if (attempt + 1 >= configRef.current.maxRetry) {
                    setHasError(true);
                    setIsLoaded(false);
                    return;
                }
                await sleep(configRef.current.backoff * (attempt + 1));
                await retry(attempt + 1);
            }
        };

        await retry();
    }, []);

    return { isLoaded, hasError, setHasError, loadWithRetry };
}
