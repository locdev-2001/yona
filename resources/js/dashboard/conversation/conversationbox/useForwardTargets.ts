import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError, parseApiErrorMessage } from 'dashboard/helper/apiClient';

import { fetchForwardTargets } from '../forwardApi';
import type { ForwardTarget } from '../forwardApi';

export const FORWARD_SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_MAX_TARGETS = 10;

export type ForwardTargetsStatus = 'loading' | 'ready' | 'error' | 'blocked';

interface UseForwardTargetsArgs {
    accountId: number;
    conversationId: number;
    messageId: number;
    query: string;
}

/**
 * Danh sách hội thoại đích cho hộp chuyển tiếp. Gõ nhanh chỉ tạo một request sau
 * khi ngừng gõ; response đến muộn của từ khoá cũ bị bỏ. Máy chủ trả 422 nghĩa là
 * tin nguồn không chuyển tiếp được → `blocked` kèm câu của máy chủ.
 */
export function useForwardTargets({ accountId, conversationId, messageId, query }: UseForwardTargetsArgs): {
    targets: ForwardTarget[];
    maxTargets: number;
    status: ForwardTargetsStatus;
    error: string | null;
    reload: () => void;
} {
    const [targets, setTargets] = useState<ForwardTarget[]>([]);
    const [maxTargets, setMaxTargets] = useState(DEFAULT_MAX_TARGETS);
    const [status, setStatus] = useState<ForwardTargetsStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const [reloadCount, setReloadCount] = useState(0);
    const latestRequestRef = useRef(0);

    useEffect(() => {
        const requestId = latestRequestRef.current + 1;
        latestRequestRef.current = requestId;
        setStatus('loading');

        const timer = window.setTimeout(() => {
            fetchForwardTargets(accountId, conversationId, messageId, query).then(
                response => {
                    if (latestRequestRef.current !== requestId) return;
                    setTargets(Array.isArray(response?.payload) ? response.payload : []);
                    setMaxTargets(response?.max_targets ?? DEFAULT_MAX_TARGETS);
                    setError(null);
                    setStatus('ready');
                },
                (reason: unknown) => {
                    if (latestRequestRef.current !== requestId) return;
                    const isBlocked = reason instanceof ApiError && reason.status === 422;
                    setError(isBlocked ? parseApiErrorMessage(reason) : null);
                    setStatus(isBlocked ? 'blocked' : 'error');
                },
            );
        }, FORWARD_SEARCH_DEBOUNCE_MS);

        return () => window.clearTimeout(timer);
    }, [accountId, conversationId, messageId, query, reloadCount]);

    const reload = useCallback(() => setReloadCount(count => count + 1), []);

    return { targets, maxTargets, status, error, reload };
}
