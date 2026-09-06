import { useSyncExternalStore } from 'react';

import { getCsatMetrics, getCsatResponses, type CsatFilterParams, type CsatSurveyResponse } from './api';

// Port từ dashboard/store/modules/csat.js — vuex đổi thành ô nhớ cấp module
// + useSyncExternalStore, cùng lối `store.ts` của lớp báo cáo.

export interface CsatMetricsState {
    totalResponseCount: number;
    ratingsCount: Record<number, number>;
    totalSentMessagesCount: number;
}

interface CsatState {
    records: CsatSurveyResponse[];
    metrics: CsatMetricsState;
    uiFlags: {
        isFetching: boolean;
        isFetchingMetrics: boolean;
    };
}

const EMPTY_METRICS: CsatMetricsState = {
    totalResponseCount: 0,
    ratingsCount: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    totalSentMessagesCount: 0,
};

const INITIAL_STATE: CsatState = {
    records: [],
    metrics: EMPTY_METRICS,
    uiFlags: { isFetching: false, isFetchingMetrics: false },
};

let state: CsatState = INITIAL_STATE;
const listeners = new Set<() => void>();

function commit(next: (current: CsatState) => CsatState): void {
    state = next(state);
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useCsatState<T>(selector: (current: CsatState) => T): T {
    return useSyncExternalStore(
        subscribe,
        () => selector(state),
        () => selector(state),
    );
}

// Chỉ dùng cho test.
export function resetCsatStore(): void {
    commit(() => INITIAL_STATE);
}

function setUIFlag(flag: keyof CsatState['uiFlags'], value: boolean): void {
    commit(current => ({ ...current, uiFlags: { ...current.uiFlags, [flag]: value } }));
}

export async function fetchCsatResponses(
    accountId: number,
    params: CsatFilterParams & { page: number },
): Promise<void> {
    setUIFlag('isFetching', true);
    try {
        const records = await getCsatResponses(accountId, params);
        commit(current => ({ ...current, records }));
    } catch {
        // Bản gốc nuốt lỗi.
    } finally {
        setUIFlag('isFetching', false);
    }
}

export async function fetchCsatMetrics(accountId: number, params: CsatFilterParams): Promise<void> {
    setUIFlag('isFetchingMetrics', true);
    try {
        const response = await getCsatMetrics(accountId, params);
        const ratings = response.ratings_count ?? {};
        commit(current => ({
            ...current,
            metrics: {
                totalResponseCount: response.total_count || 0,
                ratingsCount: {
                    1: ratings['1'] || 0,
                    2: ratings['2'] || 0,
                    3: ratings['3'] || 0,
                    4: ratings['4'] || 0,
                    5: ratings['5'] || 0,
                },
                totalSentMessagesCount: response.total_sent_messages_count || 0,
            },
        }));
    } catch {
        // như trên
    } finally {
        setUIFlag('isFetchingMetrics', false);
    }
}

const computeDistribution = (value: number, total: number): string => ((value * 100) / total).toFixed(2);

export const csatSelectors = {
    responses: (current: CsatState) => current.records,
    metrics: (current: CsatState) => current.metrics,
    uiFlags: (current: CsatState) => current.uiFlags,
    ratingCount: (current: CsatState) => current.metrics.ratingsCount,
    satisfactionScore: (current: CsatState) =>
        current.metrics.totalResponseCount
            ? computeDistribution(
                  current.metrics.ratingsCount[4] + current.metrics.ratingsCount[5],
                  current.metrics.totalResponseCount,
              )
            : 0,
    responseRate: (current: CsatState) =>
        current.metrics.totalSentMessagesCount
            ? computeDistribution(current.metrics.totalResponseCount, current.metrics.totalSentMessagesCount)
            : 0,
};
