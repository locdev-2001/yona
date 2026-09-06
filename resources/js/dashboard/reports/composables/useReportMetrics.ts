import { formatTime } from '@chatwoot/utils';

import { reportsSelectors, useReportsState, type FetchingStatus } from '../store';
import type { AccountSummary } from '../types';

// Port từ dashboard/composables/useReportMetrics.js — getter vuex đổi thành
// selector của store báo cáo; hai selector mặc định ứng với getAccountSummary /
// getAccountSummaryFetchingStatus.

export type AccountSummarySelector = (summaryState: never) => AccountSummary;

export const AVERAGE_METRIC_KEYS = ['avg_first_response_time', 'avg_resolution_time', 'reply_time'];

export function isAverageMetricType(key: string): boolean {
    return AVERAGE_METRIC_KEYS.includes(key);
}

export function calculateTrendFor(accountSummary: AccountSummary, key: string): number {
    const previous = accountSummary.previous?.[key];
    if (!previous) return 0;
    const diff = Number(accountSummary[key]) - Number(previous);
    return Math.round((diff / Number(previous)) * 100);
}

export function displayMetricFor(accountSummary: AccountSummary, key: string): string {
    if (isAverageMetricType(key)) {
        return formatTime(Number(accountSummary[key]));
    }
    return Number(accountSummary[key] || '').toLocaleString();
}

export function useReportMetrics(
    accountSummarySelector = reportsSelectors.accountSummary,
    summaryFetchingSelector = reportsSelectors.accountSummaryFetchingStatus,
): {
    accountSummary: AccountSummary;
    calculateTrend: (key: string) => number;
    isAverageMetricType: (key: string) => boolean;
    displayMetric: (key: string) => string;
    fetchingStatus: FetchingStatus;
} {
    const accountSummary = useReportsState(accountSummarySelector);
    const fetchingStatus = useReportsState(summaryFetchingSelector);

    return {
        accountSummary,
        calculateTrend: (key: string) => calculateTrendFor(accountSummary, key),
        isAverageMetricType,
        displayMetric: (key: string) => displayMetricFor(accountSummary, key),
        fetchingStatus,
    };
}
