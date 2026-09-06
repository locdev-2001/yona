import type { WorkingHourPayload } from './helpers/businessHour';

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
    working_hours: WorkingHourPayload[];
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
    // Kênh Web Widget (_inbox.json.jbuilder mục WebWidget Attributes).
    allowed_domains?: string | null;
    widget_color?: string | null;
    welcome_title?: string | null;
    welcome_tagline?: string | null;
    web_widget_script?: string | null;
    website_token?: string | null;
    selected_feature_flags?: string[] | null;
    reply_time?: string | null;
    continuity_via_email?: boolean | null;
    pre_chat_form_enabled?: boolean | null;
    pre_chat_form_options?: Record<string, unknown> | null;
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
