// Shape trả về từ InboxResource (api/v1/models/_inbox.json.jbuilder).
export interface Inbox {
    id: number;
    avatar_url: string;
    channel_id: number;
    name: string;
    channel_type: string;
    greeting_enabled: boolean;
    greeting_message: string | null;
    working_hours_enabled: boolean;
    enable_email_collect: boolean;
    csat_survey_enabled: boolean;
    csat_config: Record<string, unknown>;
    enable_auto_assignment: boolean;
    auto_assignment_config: Record<string, unknown>;
    out_of_office_message: string | null;
    timezone: string;
    callback_webhook_url: string | null;
    allow_messages_after_resolved: boolean;
    lock_to_single_conversation: boolean;
    sender_name_type: 'friendly' | 'professional';
    business_name: string | null;
    // Key kênh khác (null với kênh API) — giữ shape như bản gốc.
    website_url?: string | null;
    email?: string | null;
    phone_number?: string | null;
    hmac_mandatory?: boolean | null;
    // Kênh API (hmac_token/secret chỉ có với administrator).
    hmac_token?: string;
    secret?: string;
    webhook_url?: string | null;
    inbox_identifier?: string;
    additional_attributes?: Record<string, unknown>;
    medium?: string | null;
    voice_enabled?: boolean;
}

export interface Agent {
    id: number;
    name: string;
    role: 'agent' | 'administrator';
    email: string;
    thumbnail: string;
    availability_status: string;
}
