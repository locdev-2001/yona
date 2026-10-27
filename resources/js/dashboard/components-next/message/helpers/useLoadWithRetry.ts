import { useCallback, useEffect, useRef, useState } from 'react';

// Nạp ảnh, thử lại với backoff tăng dần. Hết `maxRetry` lượt đầu thì báo lỗi để ô
// hiện "Tải thất bại", nhưng vẫn thử tiếp ngầm tới `maxBackgroundAttempts` lượt:
// lỗi tạm (máy chủ khởi động lại khi deploy, mạng chập chờn) qua đi thì ảnh tự hiện
// mà không cần người dùng bấm. Mỗi lượt nạp mới (URL đổi, bấm tải lại) huỷ lượt cũ
// để lượt cũ thất bại muộn không đè lên ảnh đã tải xong.
interface LoadWithRetryConfig {
    maxRetry?: number;
    backoff?: number;
    maxBackoff?: number;
    maxBackgroundAttempts?: number;
}

function loadImage(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Failed to load image'));
        image.src = url;
    });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useLoadWithRetry({
    maxRetry = 3,
    backoff = 1000,
    maxBackoff = 30000,
    maxBackgroundAttempts = 20,
}: LoadWithRetryConfig = {}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const configRef = useRef({ maxRetry, backoff, maxBackoff, maxBackgroundAttempts });
    configRef.current = { maxRetry, backoff, maxBackoff, maxBackgroundAttempts };
    const currentLoadRef = useRef(0);

    useEffect(() => () => {
        currentLoadRef.current += 1;
    }, []);

    const loadWithRetry = useCallback(async (url: string) => {
        const loadId = ++currentLoadRef.current;
        const isCurrent = () => loadId === currentLoadRef.current;
        const config = configRef.current;

        for (let attempt = 0; attempt < config.maxBackgroundAttempts; attempt++) {
            try {
                await loadImage(url);
                if (!isCurrent()) return;
                setIsLoaded(true);
                setHasError(false);
                return;
            } catch {
                if (!isCurrent()) return;
                if (attempt + 1 === config.maxRetry) {
                    setHasError(true);
                    setIsLoaded(false);
                }
                await sleep(Math.min(config.backoff * 2 ** attempt, config.maxBackoff));
                if (!isCurrent()) return;
            }
        }
    }, []);

    return { isLoaded, hasError, setHasError, loadWithRetry };
}
