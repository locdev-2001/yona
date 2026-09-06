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
    // Kênh Email (_inbox.json.jbuilder mục Email Channel Attributes) — nhóm
    // imap_*/smtp_* chỉ trả về cho administrator.
    forwarding_enabled?: boolean;
    forward_to_email?: string | null;
    imap_enabled?: boolean;
    imap_address?: string;
    imap_port?: number | string;
    imap_login?: string;
    imap_password?: string | null;
    imap_enable_ssl?: boolean;
    imap_authentication?: string | null;
    smtp_enabled?: boolean;
    smtp_address?: string;
    smtp_port?: number | string;
    smtp_login?: string;
    smtp_password?: string | null;
    smtp_domain?: string;
    smtp_enable_ssl_tls?: boolean;
    smtp_enable_starttls_auto?: boolean;
    smtp_openssl_verify_mode?: string;
    smtp_authentication?: string;
    provider?: string | null;
    reauthorization_required?: boolean;
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
