import type { WidgetNotificationSound } from 'shared/alertSound/alertTones';
import type { WorkingHourPayload } from './helpers/businessHour';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';

/** kind chấp nhận ở `widget_settings.other_channels` (App\Support\Widget\WidgetSettings::CHANNEL_KINDS). */
export type WidgetOtherChannelKind =
    | 'zalo'
    | 'messenger'
    | 'telegram'
    | 'whatsapp'
    | 'instagram'
    | 'tiktok'
    | 'hotline'
    | 'email'
    | 'custom';

/** `widget_settings` của hộp thư website (App\Support\Widget\WidgetSettings), đã trộn mặc định. */
export interface WidgetSettingsShape {
    appearance: {
        launcher: 'round' | 'pill';
        launcher_label: string | null;
        position: 'left' | 'right';
        greeting: string | null;
    };
    home: {
        blocks: {
            recent_conversation: boolean;
            help: boolean;
            other_channels: boolean;
            custom_links: boolean;
            request: boolean;
        };
    };
    other_channels: { kind: WidgetOtherChannelKind; label: string | null; value: string; enabled: boolean }[];
    custom_links: { label: string; url: string }[];
    capture: { phone: boolean; email: boolean };
    expanded_enabled: boolean;
    notification_sound: WidgetNotificationSound;
}

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
    // Năng lực kênh (docs/channel-capabilities.md §3) — giao diện gate theo đây,
    // không theo `channel_type`.
    capabilities?: readonly string[] | null;
    // Nền tảng kênh tự khai (logo + tên thương hiệu).
    platform?: ChannelPlatform | null;
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
    widget_settings?: WidgetSettingsShape | null;
    help_center?: { name: string; article_count: number } | null;
    // Kênh Zalo cá nhân (G1) — trạng thái phiên cho biểu ngữ quét lại QR.
    zalo_state?: string | null;
    zalo_display_name?: string | null;
    zalo_uid?: string | null;
    zalo_phone?: string | null;
    zalo_last_connected_at?: string | null;
    website_token?: string | null;
    selected_feature_flags?: string[] | null;
    reply_time?: string | null;
    continuity_via_email?: boolean | null;
    pre_chat_form_enabled?: boolean | null;
    pre_chat_form_options?: Record<string, unknown> | null;
    // Chữ mặc định theo ngôn ngữ account, do server cấp.
    pre_chat_form_defaults?: Record<string, unknown> | null;
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
    // Lời nhắn cụ thể khi kênh mất kết nối (vd máy chủ thư từ chối đăng nhập).
    connection_error?: string | null;
    // Kênh nối qua OAuth: đường kết nối lại với nhà cung cấp.
    reconnect_url?: string | null;
    // Kênh API (hmac_token/secret chỉ có với administrator).
    hmac_token?: string;
    secret?: string;
    webhook_url?: string | null;
    inbox_identifier?: string;
    additional_attributes?: Record<string, unknown>;
    medium?: string | null;
    voice_enabled?: boolean;
    // Kênh ngoài F2–F5 (_inbox.json.jbuilder mục "Channel specific settings").
    bot_name?: string | null;
    page_id?: string | null;
    instagram_id?: string | null;
    tweets_enabled?: boolean | null;
    account_sid?: string | null;
    auth_token?: string | null;
    api_key_sid?: string | null;
    content_templates?: Record<string, unknown> | unknown[] | null;
    message_templates?: unknown[] | null;
    provider_config?: Record<string, unknown> | null;
}

export interface Agent {
    id: number;
    name: string;
    role: 'agent' | 'administrator';
    email: string;
    thumbnail: string;
    availability_status: string;
}
