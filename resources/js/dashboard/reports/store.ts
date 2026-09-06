import { useSyncExternalStore } from 'react';

import { clampDataBetweenTimeline, type HeatmapPoint } from 'shared/helpers/reportsDataHelper';
import {
    getBotSummary,
    getConversationMetric,
    getGroupedConversations,
    getReports,
    getSummary,
    type GetReportsParams,
} from './api';
import type {
    AccountSummary,
    AgentConversationMetric,
    ConversationMetric,
    ReportDataPoint,
    TeamConversationMetric,
} from './types';

// Port từ dashboard/store/modules/reports.js — vuex đổi thành một ô nhớ cấp module
// + useSyncExternalStore (cùng lối useAgentsList.ts đã dùng cho store hội thoại).

export const STATUS = {
    FAILED: 'failed',
    FETCHING: 'fetching',
    FINISHED: 'finished',
} as const;

export type FetchingStatus = (typeof STATUS)[keyof typeof STATUS];

export const REPORT_METRIC_KEYS = [
    'conversations_count',
    'incoming_messages_count',
    'outgoing_messages_count',
    'avg_first_response_time',
    'avg_resolution_time',
    'resolutions_count',
    'bot_resolutions_count',
    'bot_handoffs_count',
    'reply_time',
] as const;

export type ReportMetricKey = (typeof REPORT_METRIC_KEYS)[number];

interface OverviewUIFlags {
    isFetchingAccountConversationMetric: boolean;
    isFetchingAccountConversationsHeatmap: boolean;
    isFetchingAccountResolutionsHeatmap: boolean;
    isFetchingAgentConversationMetric: boolean;
    isFetchingTeamConversationMetric: boolean;
}

interface ReportsState {
    accountSummaryFetchingStatus: FetchingStatus;
    botSummaryFetchingStatus: FetchingStatus;
    accountReport: {
        isFetching: Record<string, boolean>;
        data: Record<string, ReportDataPoint[]>;
    };
    accountSummary: AccountSummary;
    botSummary: AccountSummary;
    overview: {
        uiFlags: OverviewUIFlags;
        accountConversationMetric: ConversationMetric;
        accountConversationHeatmap: HeatmapPoint[];
        accountResolutionHeatmap: HeatmapPoint[];
        agentConversationMetric: AgentConversationMetric[];
        teamConversationMetric: TeamConversationMetric[];
    };
}

const emptyMetricRecord = <T,>(value: () => T): Record<string, T> =>
    Object.fromEntries(REPORT_METRIC_KEYS.map(key => [key, value()]));

export const EMPTY_ACCOUNT_SUMMARY: AccountSummary = {
    avg_first_response_time: 0,
    avg_resolution_time: 0,
    conversations_count: 0,
    incoming_messages_count: 0,
    outgoing_messages_count: 0,
    reply_time: 0,
    resolutions_count: 0,
    bot_resolutions_count: 0,
    bot_handoffs_count: 0,
    previous: {},
};

export const EMPTY_BOT_SUMMARY: AccountSummary = {
    ...EMPTY_ACCOUNT_SUMMARY,
};

let state: ReportsState = {
    accountSummaryFetchingStatus: STATUS.FINISHED,
    botSummaryFetchingStatus: STATUS.FINISHED,
    accountReport: {
        isFetching: emptyMetricRecord(() => false),
        data: emptyMetricRecord<ReportDataPoint[]>(() => []),
    },
    accountSummary: EMPTY_ACCOUNT_SUMMARY,
    botSummary: EMPTY_BOT_SUMMARY,
    overview: {
        uiFlags: {
            isFetchingAccountConversationMetric: false,
            isFetchingAccountConversationsHeatmap: false,
            isFetchingAccountResolutionsHeatmap: false,
            isFetchingAgentConversationMetric: false,
            isFetchingTeamConversationMetric: false,
        },
        accountConversationMetric: {},
        accountConversationHeatmap: [],
        accountResolutionHeatmap: [],
        agentConversationMetric: [],
        teamConversationMetric: [],
    },
};

const listeners = new Set<() => void>();

function commit(next: (current: ReportsState) => ReportsState): void {
    state = next(state);
    listeners.forEach(listener => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useReportsState<T>(selector: (current: ReportsState) => T): T {
    return useSyncExternalStore(
        subscribe,
        () => selector(state),
        () => selector(state),
    );
}

// Chỉ dùng cho test: đưa store về trạng thái đầu.
export function resetReportsStore(): void {
    commit(() => ({
        accountSummaryFetchingStatus: STATUS.FINISHED,
        botSummaryFetchingStatus: STATUS.FINISHED,
        accountReport: {
            isFetching: emptyMetricRecord(() => false),
            data: emptyMetricRecord<ReportDataPoint[]>(() => []),
        },
        accountSummary: EMPTY_ACCOUNT_SUMMARY,
        botSummary: EMPTY_BOT_SUMMARY,
        overview: {
            uiFlags: {
                isFetchingAccountConversationMetric: false,
                isFetchingAccountConversationsHeatmap: false,
                isFetchingAccountResolutionsHeatmap: false,
                isFetchingAgentConversationMetric: false,
                isFetchingTeamConversationMetric: false,
            },
            accountConversationMetric: {},
            accountConversationHeatmap: [],
            accountResolutionHeatmap: [],
            agentConversationMetric: [],
            teamConversationMetric: [],
        },
    }));
}

function setMetricLoading(metric: string, value: boolean): void {
    commit(current => ({
        ...current,
        accountReport: {
            ...current.accountReport,
            isFetching: { ...current.accountReport.isFetching, [metric]: value },
        },
    }));
}

function setOverviewFlag(flag: keyof OverviewUIFlags, value: boolean): void {
    commit(current => ({
        ...current,
        overview: { ...current.overview, uiFlags: { ...current.overview.uiFlags, [flag]: value } },
    }));
}

export async function fetchAccountReport(accountId: number, request: GetReportsParams & { metric: string }): Promise<void> {
    const { metric } = request;
    setMetricLoading(metric, true);
    try {
        const data = clampDataBetweenTimeline(await getReports(accountId, request), request.from, request.to);
        commit(current => ({
            ...current,
            accountReport: { ...current.accountReport, data: { ...current.accountReport.data, [metric]: data } },
        }));
    } finally {
        setMetricLoading(metric, false);
    }
}

export async function fetchAccountSummary(accountId: number, request: GetReportsParams): Promise<void> {
    commit(current => ({ ...current, accountSummaryFetchingStatus: STATUS.FETCHING }));
    try {
        const summary = (await getSummary(accountId, request)) as unknown as AccountSummary;
        commit(current => ({
            ...current,
            accountSummary: summary,
            accountSummaryFetchingStatus: STATUS.FINISHED,
        }));
    } catch {
        commit(current => ({ ...current, accountSummaryFetchingStatus: STATUS.FAILED }));
    }
}

export async function fetchBotSummary(accountId: number, request: GetReportsParams): Promise<void> {
    commit(current => ({ ...current, botSummaryFetchingStatus: STATUS.FETCHING }));
    try {
        const summary = (await getBotSummary(accountId, request)) as unknown as AccountSummary;
        commit(current => ({ ...current, botSummary: summary, botSummaryFetchingStatus: STATUS.FINISHED }));
    } catch {
        commit(current => ({ ...current, botSummaryFetchingStatus: STATUS.FAILED }));
    }
}

type HeatmapKind = 'conversation' | 'resolution';

const HEATMAP_FLAGS: Record<HeatmapKind, keyof OverviewUIFlags> = {
    conversation: 'isFetchingAccountConversationsHeatmap',
    resolution: 'isFetchingAccountResolutionsHeatmap',
};

export async function fetchAccountHeatmap(
    accountId: number,
    kind: HeatmapKind,
    request: GetReportsParams & { metric: string },
): Promise<void> {
    setOverviewFlag(HEATMAP_FLAGS[kind], true);
    try {
        const data = clampDataBetweenTimeline(
            (await getReports(accountId, { ...request, groupBy: 'hour' })) as unknown as HeatmapPoint[],
            request.from,
            request.to,
        );
        commit(current => ({
            ...current,
            overview: {
                ...current.overview,
                ...(kind === 'conversation'
                    ? { accountConversationHeatmap: data }
                    : { accountResolutionHeatmap: data }),
            },
        }));
    } finally {
        setOverviewFlag(HEATMAP_FLAGS[kind], false);
    }
}

export async function fetchAccountConversationMetric(
    accountId: number,
    params: { team_id?: number } = {},
): Promise<void> {
    setOverviewFlag('isFetchingAccountConversationMetric', true);
    try {
        const metric = await getConversationMetric(accountId, params);
        commit(current => ({
            ...current,
            overview: { ...current.overview, accountConversationMetric: metric },
        }));
    } catch {
        // Bản gốc nuốt lỗi và chỉ tắt cờ loading.
    } finally {
        setOverviewFlag('isFetchingAccountConversationMetric', false);
    }
}

export async function fetchAgentConversationMetric(accountId: number): Promise<void> {
    setOverviewFlag('isFetchingAgentConversationMetric', true);
    try {
        const metric = await getGroupedConversations(accountId, 'assignee_id');
        commit(current => ({ ...current, overview: { ...current.overview, agentConversationMetric: metric } }));
    } catch {
        // như trên
    } finally {
        setOverviewFlag('isFetchingAgentConversationMetric', false);
    }
}

export async function fetchTeamConversationMetric(accountId: number): Promise<void> {
    setOverviewFlag('isFetchingTeamConversationMetric', true);
    try {
        const metric = await getGroupedConversations(accountId, 'team_id');
        commit(current => ({ ...current, overview: { ...current.overview, teamConversationMetric: metric } }));
    } catch {
        // như trên
    } finally {
        setOverviewFlag('isFetchingTeamConversationMetric', false);
    }
}

export const reportsSelectors = {
    accountReport: (current: ReportsState) => current.accountReport,
    accountSummary: (current: ReportsState) => current.accountSummary,
    accountSummaryFetchingStatus: (current: ReportsState) => current.accountSummaryFetchingStatus,
    botSummary: (current: ReportsState) => current.botSummary,
    botSummaryFetchingStatus: (current: ReportsState) => current.botSummaryFetchingStatus,
    overviewUIFlags: (current: ReportsState) => current.overview.uiFlags,
    accountConversationMetric: (current: ReportsState) => current.overview.accountConversationMetric,
    accountConversationHeatmap: (current: ReportsState) => current.overview.accountConversationHeatmap,
    accountResolutionHeatmap: (current: ReportsState) => current.overview.accountResolutionHeatmap,
    agentConversationMetric: (current: ReportsState) => current.overview.agentConversationMetric,
    teamConversationMetric: (current: ReportsState) => current.overview.teamConversationMetric,
};
