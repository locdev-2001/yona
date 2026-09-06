// Shape payload theo jbuilder Chatwoot: _conversation partial + _message + push_event_data.

export interface ContactMeta {
    id: number;
    name: string | null;
    email?: string | null;
    phone_number?: string | null;
    identifier?: string | null;
    thumbnail?: string;
    availability_status?: string;
    blocked?: boolean;
    additional_attributes?: Record<string, unknown>;
    custom_attributes?: Record<string, unknown>;
    type?: string;
}

export interface AgentMeta {
    id: number;
    name: string;
    email?: string | null;
    available_name?: string;
    availability_status?: string;
    thumbnail?: string;
    avatar_url?: string;
    type?: string;
}

export interface TeamMeta {
    id: number;
    name: string;
    description?: string | null;
    allow_auto_assign?: boolean;
    icon?: string;
    icon_color?: string;
    account_id?: number;
    is_member?: boolean;
}

export interface MessageSender {
    id: number;
    name: string | null;
    type: 'user' | 'contact' | 'agent_bot' | 'captain_assistant';
    thumbnail?: string;
    available_name?: string;
    availability_status?: string;
    avatar_url?: string;
    email?: string | null;
}

export interface ConversationMessage {
    id: number;
    content: string | null;
    inbox_id: number;
    conversation_id: number;
    message_type: number;
    content_type: string;
    status: string | null;
    content_attributes: Record<string, unknown>;
    created_at: number;
    private: boolean;
    source_id: string | null;
    // additional_attributes.senderName/senderAvatarUrl: tin từ tích hợp ngoài
    // (Slack…) không có sender nhưng vẫn có tên người gửi.
    additional_attributes?: { senderName?: string; senderAvatarUrl?: string } & Record<string, unknown>;
    sender?: MessageSender;
    sender_type?: string | null;
    sender_id?: number | null;
    echo_id?: string;
    attachments?: Array<Record<string, unknown>>;
}

export interface ConversationMeta {
    sender: ContactMeta;
    channel: string | null;
    assignee?: AgentMeta;
    assignee_type?: string;
    team?: TeamMeta;
    hmac_verified?: boolean | null;
}

export type ConversationStatus = 'open' | 'resolved' | 'pending' | 'snoozed';
export type ConversationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Conversation {
    id: number;
    uuid: string;
    account_id: number;
    inbox_id: number;
    meta: ConversationMeta;
    messages: ConversationMessage[];
    status: ConversationStatus;
    priority: ConversationPriority | null;
    labels: string[];
    muted: boolean;
    can_reply: boolean;
    snoozed_until: string | null;
    custom_attributes: Record<string, unknown>;
    additional_attributes: Record<string, unknown>;
    agent_last_seen_at: number;
    assignee_last_seen_at: number;
    contact_last_seen_at: number;
    first_reply_created_at: number;
    unread_count: number;
    last_non_activity_message: ConversationMessage | null;
    last_activity_at: number;
    timestamp: number;
    waiting_since: number;
    created_at: number;
    updated_at: number;
    sla_policy_id: number | null;
}

export interface ConversationListMeta {
    mine_count: number;
    assigned_count: number;
    unassigned_count: number;
    all_count: number;
}

export type AssigneeTab = 'me' | 'unassigned' | 'all';
export type ConversationStatusFilter = 'open' | 'resolved' | 'pending' | 'snoozed' | 'all';
