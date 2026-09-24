import { getJson, getText } from 'dashboard/helper/apiClient';
import { sendWithSessionRecovery } from 'dashboard/helper/sessionRecovery';
import type { AgentConversationMetric, ConversationMetric, DrilldownMeta, DrilldownRecord, ReportDataPoint, TeamConversationMetric } from './types';

// Port từ dashboard/api/{reports,liveReports,summaryReports}.js — cùng đường dẫn
// /api/v2/accounts/{id}/... và cùng tên tham số query.

const getTimeOffset = () => -new Date().getTimezoneOffset() / 60;

type QueryValue = string | number | boolean | null | undefined | (string | number)[];

function buildQuery(params: Record<string, QueryValue>): string {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        // axios của bản gốc rải mảng thành `key[]=…`; Laravel đọc lại thành mảng.
        if (Array.isArray(value)) {
            value.forEach(entry => search.append(`${key}[]`, String(entry)));
            return;
        }
        search.set(key, String(value));
    });
    const query = search.toString();
    return query ? `?${query}` : '';
}

export function reportsUrl(accountId: number): string {
    return `/api/v2/accounts/${accountId}/reports`;
}

export interface GetReportsParams {
    metric?: string;
    from: number;
    to: number;
    type?: string;
    id?: string | number | null;
    groupBy?: string;
    businessHours?: boolean;
}

export function getReports(
    accountId: number,
    { metric, from, to, type = 'account', id, groupBy, businessHours }: GetReportsParams,
): Promise<ReportDataPoint[]> {
    return getJson<ReportDataPoint[]>(
        `${reportsUrl(accountId)}${buildQuery({
            metric,
            since: from,
            until: to,
            type,
            id,
            group_by: groupBy,
            business_hours: businessHours,
            timezone_offset: getTimeOffset(),
        })}`,
    );
}

export interface GetDrilldownParams extends GetReportsParams {
    bucketTimestamp?: number | null;
    page?: number;
    perPage?: number;
}

export function getDrilldown(
    accountId: number,
    { metric, bucketTimestamp, from, to, type = 'account', id, groupBy, businessHours, page, perPage }: GetDrilldownParams,
    signal?: AbortSignal,
): Promise<{ meta: DrilldownMeta; payload: DrilldownRecord[] }> {
    const url = `${reportsUrl(accountId)}/drilldown${buildQuery({
        metric,
        bucket_timestamp: bucketTimestamp,
        since: from,
        until: to,
        type,
        id,
        group_by: groupBy,
        business_hours: businessHours,
        timezone_offset: getTimeOffset(),
        page,
        per_page: perPage,
    })}`;

    return sendWithSessionRecovery(() =>
        fetch(url, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
            signal,
        }),
    ).then(response => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json() as Promise<{ meta: DrilldownMeta; payload: DrilldownRecord[] }>;
    });
}

export function getSummary(
    accountId: number,
    { from, to, type = 'account', id, groupBy, businessHours }: GetReportsParams,
): Promise<Record<string, unknown>> {
    return getJson<Record<string, unknown>>(
        `${reportsUrl(accountId)}/summary${buildQuery({
            since: from,
            until: to,
            type,
            id,
            group_by: groupBy,
            business_hours: businessHours,
            timezone_offset: getTimeOffset(),
        })}`,
    );
}

export function getConversationsSummaryReports(
    accountId: number,
    { from, to, businessHours }: { from: number; to: number; businessHours?: boolean },
): Promise<string> {
    return getText(
        `${reportsUrl(accountId)}/conversations_summary${buildQuery({
            since: from,
            until: to,
            business_hours: businessHours,
        })}`,
    );
}

export function getConversationTrafficCsv(accountId: number, daysBefore = 6): Promise<string> {
    return getText(
        `${reportsUrl(accountId)}/conversation_traffic${buildQuery({
            timezone_offset: getTimeOffset(),
            days_before: daysBefore,
        })}`,
    );
}

// liveReports.js
export function getConversationMetric(
    accountId: number,
    params: { team_id?: number } = {},
): Promise<ConversationMetric> {
    return getJson<ConversationMetric>(
        `/api/v2/accounts/${accountId}/live_reports/conversation_metrics${buildQuery(params)}`,
    );
}

export function getGroupedConversations(
    accountId: number,
    groupBy: 'assignee_id',
): Promise<AgentConversationMetric[]>;
export function getGroupedConversations(
    accountId: number,
    groupBy: 'team_id',
): Promise<TeamConversationMetric[]>;
export function getGroupedConversations(accountId: number, groupBy: string): Promise<unknown[]> {
    return getJson<unknown[]>(
        `/api/v2/accounts/${accountId}/live_reports/grouped_conversation_metrics${buildQuery({ group_by: groupBy })}`,
    );
}

// summaryReports.js — dùng cho các trang Agent/Inbox/Label/Team (nhóm d2-fe-pages).
type SummaryReportScope = 'team' | 'agent' | 'inbox' | 'label';

export function getSummaryReports(
    accountId: number,
    scope: SummaryReportScope,
    { since, until, businessHours }: { since: number; until: number; businessHours?: boolean },
): Promise<unknown[]> {
    return getJson<unknown[]>(
        `/api/v2/accounts/${accountId}/summary_reports/${scope}${buildQuery({
            since,
            until,
            business_hours: businessHours,
        })}`,
    );
}

// --- Bot (BotReports/BotMetrics) ---

export interface BotMetrics {
    conversation_count: number;
    message_count: number;
    resolution_rate: number;
    handoff_rate: number;
}

export function getBotMetrics(accountId: number, { from, to }: { from: number; to: number }): Promise<BotMetrics> {
    return getJson<BotMetrics>(`${reportsUrl(accountId)}/bot_metrics${buildQuery({ since: from, until: to })}`);
}

export function getBotSummary(
    accountId: number,
    { from, to, groupBy, businessHours }: GetReportsParams,
): Promise<Record<string, unknown>> {
    return getJson<Record<string, unknown>>(
        `${reportsUrl(accountId)}/bot_summary${buildQuery({
            since: from,
            until: to,
            type: 'account',
            group_by: groupBy,
            business_hours: businessHours,
        })}`,
    );
}

// --- CSV theo thực thể (nút "Download … reports") ---

export type EntityReportType = 'agent' | 'inbox' | 'label' | 'team';

const ENTITY_CSV_PATHS: Record<EntityReportType, string> = {
    agent: 'agents',
    inbox: 'inboxes',
    label: 'labels',
    team: 'teams',
};

export function getEntityReportsCsv(
    accountId: number,
    type: EntityReportType,
    { from, to, businessHours }: { from: number; to: number; businessHours?: boolean },
): Promise<string> {
    return getText(
        `${reportsUrl(accountId)}/${ENTITY_CSV_PATHS[type]}${buildQuery({
            since: from,
            until: to,
            business_hours: businessHours,
        })}`,
    );
}

// --- CSAT (api/csatReports.js) ---

export interface CsatFilterParams {
    from: number;
    to: number;
    user_ids?: number[];
    inbox_id?: number | null;
    team_id?: number | null;
    rating?: number | null;
}

export interface CsatSurveyResponse {
    id: number;
    rating: number;
    feedback_message: string | null;
    account_id: number;
    message_id: number;
    conversation_id: number;
    contact: { id: number; name: string; thumbnail?: string } | null;
    assigned_agent: { id: number; name: string; thumbnail?: string; availability_status?: string } | null;
    created_at: number;
}

export interface CsatMetricsResponse {
    total_count: number;
    ratings_count: Record<string, number>;
    total_sent_messages_count: number;
}

const csatQuery = ({ from, to, user_ids, inbox_id, team_id, rating }: CsatFilterParams) => ({
    since: from,
    until: to,
    user_ids,
    inbox_id,
    team_id,
    rating,
});

export function getCsatResponses(
    accountId: number,
    { page, ...filters }: CsatFilterParams & { page: number },
): Promise<CsatSurveyResponse[]> {
    return getJson<CsatSurveyResponse[]>(
        `/api/v1/accounts/${accountId}/csat_survey_responses${buildQuery({
            page,
            sort: '-created_at',
            ...csatQuery(filters),
        })}`,
    );
}

export function getCsatMetrics(accountId: number, filters: CsatFilterParams): Promise<CsatMetricsResponse> {
    return getJson<CsatMetricsResponse>(
        `/api/v1/accounts/${accountId}/csat_survey_responses/metrics${buildQuery(csatQuery(filters))}`,
    );
}

export function getCsatCsv(accountId: number, filters: CsatFilterParams): Promise<string> {
    return getText(
        `/api/v1/accounts/${accountId}/csat_survey_responses/download${buildQuery({
            sort: '-created_at',
            ...csatQuery(filters),
        })}`,
    );
}
