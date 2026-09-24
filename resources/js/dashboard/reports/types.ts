// Kiểu dữ liệu chung của nhóm báo cáo (khớp API báo cáo v2).

export interface ReportDataPoint {
    value: number;
    timestamp: number;
    count?: number;
}

export interface AccountSummary {
    avg_first_response_time: number | string;
    avg_resolution_time: number | string;
    conversations_count: number;
    incoming_messages_count: number;
    outgoing_messages_count: number;
    reply_time: number | string;
    resolutions_count: number;
    bot_resolutions_count?: number;
    bot_handoffs_count?: number;
    previous: Partial<Record<string, number>>;
    [key: string]: unknown;
}

export interface ConversationMetric {
    open?: number;
    unattended?: number;
    unassigned?: number;
    pending?: number;
    [key: string]: number | undefined;
}

export interface AgentConversationMetric {
    assignee_id: number;
    open?: number;
    unattended?: number;
}

export interface TeamConversationMetric {
    team_id: number;
    open?: number;
    unattended?: number;
}

export interface AgentStatusMetric {
    online?: number;
    busy?: number;
    offline?: number;
    [key: string]: number | undefined;
}

export interface ReportRequestPayload {
    metric?: string;
    from: number;
    to: number;
    type?: string;
    id?: string | number | null;
    groupBy?: string;
    businessHours?: boolean;
}

export interface DrilldownRecord {
    record_type: 'message' | 'conversation';
    occurred_at?: number;
    metric_value?: number | null;
    event_name?: string;
    message?: {
        id?: number;
        content?: string;
        created_at?: number;
        message_type?: 'incoming' | 'outgoing' | string;
    };
    conversation?: {
        id?: number;
        display_id?: number;
        status?: string;
        contact_id?: number;
        contact_name?: string;
        inbox_id?: number;
        inbox_name?: string;
        assignee_id?: number;
        assignee_name?: string;
        created_at?: number;
        last_activity_at?: number;
        last_message?: { content?: string };
    };
}

export interface DrilldownMeta {
    current_page?: number;
    total_count?: number;
    conversation_count?: number;
    record_type?: 'message' | 'conversation';
}
