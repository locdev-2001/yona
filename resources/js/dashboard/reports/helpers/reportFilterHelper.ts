// Port từ routes/dashboard/settings/reports/helpers/reportFilterHelper.js.

export interface ReportURLParams {
    from?: number | null;
    to?: number | null;
    businessHours?: boolean;
    groupBy?: number | null;
    range?: string | null;
}

export function generateReportURLParams({
    from,
    to,
    businessHours,
    groupBy,
    range,
}: ReportURLParams): Record<string, string> {
    const params: Record<string, string> = {};

    if (from) params.from = String(from);
    if (to) params.to = String(to);

    if (businessHours) params.business_hours = 'true';
    if (groupBy) params.group_by = String(groupBy);

    if (range) params.range = range;

    return params;
}

export function parseReportURLParams(query: Record<string, string | undefined>): {
    from: number | null;
    to: number | null;
    businessHours: boolean;
    groupBy: number | null;
    range: string | null;
} {
    const { from, to, business_hours: businessHours, group_by: groupBy, range } = query;

    return {
        from: from ? Number(from) : null,
        to: to ? Number(to) : null,
        businessHours: businessHours === 'true',
        groupBy: groupBy ? Number(groupBy) : null,
        range: range || null,
    };
}

export interface ReportEntityFilters {
    agent_id?: number | null;
    inbox_id?: number | null;
    team_id?: number | null;
    sla_policy_id?: number | null;
    label?: string | null;
    rating?: number | null;
}

export function parseFilterURLParams(query: Record<string, string | undefined>): ReportEntityFilters {
    return {
        agent_id: query.agent_id ? Number(query.agent_id) : null,
        inbox_id: query.inbox_id ? Number(query.inbox_id) : null,
        team_id: query.team_id ? Number(query.team_id) : null,
        sla_policy_id: query.sla_policy_id ? Number(query.sla_policy_id) : null,
        label: query.label || null,
        rating: query.rating ? Number(query.rating) : null,
    };
}

export function generateFilterURLParams(filters: ReportEntityFilters): Record<string, string> {
    const params: Record<string, string> = {};
    if (filters.agent_id) params.agent_id = String(filters.agent_id);
    if (filters.inbox_id) params.inbox_id = String(filters.inbox_id);
    if (filters.team_id) params.team_id = String(filters.team_id);
    if (filters.sla_policy_id) params.sla_policy_id = String(filters.sla_policy_id);
    if (filters.label) params.label = filters.label;
    if (filters.rating) params.rating = String(filters.rating);
    return params;
}

export function generateCompleteURLParams({
    from,
    to,
    range,
    filters = {},
}: ReportURLParams & { filters?: ReportEntityFilters }): Record<string, string> {
    return { ...generateReportURLParams({ from, to, range }), ...generateFilterURLParams(filters) };
}
