import { useCallback, useEffect, useRef, useState } from 'react';

// Hỏi lại sau 2s, 4s, 8s rồi 15s mỗi lần; dừng sau MAX_POLL_ATTEMPTS lượt để người dùng tự bấm Thử lại.
export const POLL_DELAYS_MS = [2000, 4000, 8000, 15000] as const;
export const MAX_POLL_ATTEMPTS = 10;

export const pollDelayFor = (attempt: number) => POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)];

interface ProcessingPollOptions {
    // Khoá đổi (bộ khác, có sticker mới vào hàng xử lý) thì đếm lại từ đầu.
    resetKey: string;
    active: boolean;
    poll: () => Promise<void>;
}

export function useProcessingPoll({ resetKey, active, poll }: ProcessingPollOptions) {
    const [attempt, setAttempt] = useState(0);
    const [isHidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden);
    const pollRef = useRef(poll);
    pollRef.current = poll;

    useEffect(() => setAttempt(0), [resetKey]);

    useEffect(() => {
        const onVisibility = () => setHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);

        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    const exhausted = attempt >= MAX_POLL_ATTEMPTS;

    useEffect(() => {
        if (!active || exhausted || isHidden) return undefined;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            pollRef.current()
                .catch(() => undefined)
                .finally(() => {
                    if (!cancelled) setAttempt(current => current + 1);
                });
        }, pollDelayFor(attempt));

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [active, attempt, exhausted, isHidden, resetKey]);

    const retry = useCallback(() => setAttempt(0), []);

    return { exhausted: active && exhausted, retry };
}
