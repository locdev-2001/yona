import { useCallback, useRef, useState } from 'react';

import { getDrilldown, type GetDrilldownParams } from '../api';
import type { DrilldownMeta, DrilldownRecord } from '../types';

// Port từ routes/dashboard/settings/reports/composables/useReportDrilldown.js —
// giữ nguyên máy phân trang + hủy request (AbortController + token phiên).

export type DrilldownFetcher = (
    params: GetDrilldownParams & { page: number },
    signal: AbortSignal,
) => Promise<{ meta: DrilldownMeta; payload: DrilldownRecord[] }>;

function isAbortError(error: unknown): boolean {
    const name = (error as { name?: string })?.name;
    return name === 'AbortError' || name === 'CanceledError';
}

export function useReportDrilldown(fetcher: DrilldownFetcher) {
    const [records, setRecords] = useState<DrilldownRecord[]>([]);
    const [meta, setMeta] = useState<DrilldownMeta>({});
    const [isFetching, setFetching] = useState(false);
    const [isFetchingMore, setFetchingMore] = useState(false);
    const [hasError, setHasError] = useState(false);

    const activeRequest = useRef<GetDrilldownParams | null>(null);
    const requestToken = useRef(0);
    const activeController = useRef<AbortController | null>(null);
    const activeFingerprint = useRef<string | null>(null);
    const hasErrorRef = useRef(false);
    const metaRef = useRef<DrilldownMeta>({});
    const recordCount = useRef(0);
    const fetcherRef = useRef(fetcher);
    fetcherRef.current = fetcher;
    const isFetchingRef = useRef(false);
    const isFetchingMoreRef = useRef(false);
    isFetchingRef.current = isFetching;
    isFetchingMoreRef.current = isFetchingMore;

    const abortActiveRequest = useCallback(() => {
        if (!activeController.current) return;
        activeController.current.abort();
        activeController.current = null;
    }, []);

    const fetchPage = useCallback(async (page: number, token: number) => {
        const request = activeRequest.current;
        if (!request) return;

        const controller = new AbortController();
        activeController.current = controller;
        const setLoading = page === 1 ? setFetching : setFetchingMore;
        setLoading(true);
        setHasError(false);
        hasErrorRef.current = false;

        try {
            const response = await fetcherRef.current({ ...request, page }, controller.signal);
            if (token !== requestToken.current || !activeRequest.current) return;

            metaRef.current = response.meta || {};
            setMeta(response.meta || {});
            setRecords(current => {
                const next = page === 1 ? response.payload || [] : [...current, ...(response.payload || [])];
                recordCount.current = next.length;
                return next;
            });
        } catch (error) {
            if (token !== requestToken.current || !activeRequest.current || isAbortError(error)) return;
            setHasError(true);
            hasErrorRef.current = true;
        } finally {
            if (activeController.current === controller) activeController.current = null;
            if (token === requestToken.current && activeRequest.current) setLoading(false);
        }
    }, []);

    const open = useCallback(
        async (request: GetDrilldownParams) => {
            const fingerprint = JSON.stringify(request);
            if (activeFingerprint.current === fingerprint) {
                if (hasErrorRef.current) await fetchPage(1, requestToken.current);
                return;
            }

            abortActiveRequest();
            requestToken.current += 1;
            activeFingerprint.current = fingerprint;
            activeRequest.current = request;
            setRecords([]);
            recordCount.current = 0;
            setMeta({});
            metaRef.current = {};
            setHasError(false);
            hasErrorRef.current = false;
            setFetchingMore(false);
            await fetchPage(1, requestToken.current);
        },
        [abortActiveRequest, fetchPage],
    );

    const close = useCallback(() => {
        abortActiveRequest();
        requestToken.current += 1;
        activeFingerprint.current = null;
        activeRequest.current = null;
        setRecords([]);
        recordCount.current = 0;
        setMeta({});
        metaRef.current = {};
        setHasError(false);
        hasErrorRef.current = false;
        setFetching(false);
        setFetchingMore(false);
    }, [abortActiveRequest]);

    const hasRecords = records.length > 0;
    const hasMore = records.length < (meta.total_count || 0);

    const loadMore = useCallback(() => {
        if (!activeRequest.current || recordCount.current >= (metaRef.current.total_count || 0)) return;
        if (isFetchingRef.current || isFetchingMoreRef.current) return;
        void fetchPage((metaRef.current.current_page || 1) + 1, requestToken.current);
    }, [fetchPage]);

    return { records, meta, isFetching, isFetchingMore, hasError, hasRecords, hasMore, open, close, loadMore };
}

export function createReportDrilldownFetcher(accountId: number): DrilldownFetcher {
    return (params, signal) => getDrilldown(accountId, params, signal);
}
