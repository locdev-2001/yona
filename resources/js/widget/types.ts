// Kiểu dữ liệu của widget — bám đúng phản hồi `/api/v1/widget/*`
// (hợp đồng trong plans/260831-rewrite-chatwoot-laravel/reports/c2-notes-be.md).

export interface WorkingHourSlot {
    day_of_week: number;
    closed_all_day?: boolean;
    open_all_day?: boolean;
    open_hour?: number;
    open_minutes?: number;
    close_hour?: number;
    close_minutes?: number;
}

// Bản camelCase dùng trong helper giờ làm việc (bản gốc dùng useCamelCase).
export interface WorkingHour {
    dayOfWeek: number;
    closedAllDay?: boolean;
    openAllDay?: boolean;
    openHour?: number;
    openMinutes?: number;
    closeHour?: number;
    closeMinutes?: number;
}

export interface EnabledLanguage {
    name: string;
    iso_639_1_code: string;
}

export interface PreChatField {
    field_type: string;
    label: string;
    name: string;
    type: string;
    required: boolean;
    enabled: boolean;
    // Chỉ có ở trường sinh từ thuộc tính tuỳ biến.
    placeholder?: string;
    values?: string[];
    regex_pattern?: string;
    regex_cue?: string;
}

export interface PreChatFormOptions {
    pre_chat_message?: string;
    pre_chat_fields?: PreChatField[];
}

export interface WebsiteChannelConfigPayload {
    allow_messages_after_resolved: boolean;
    api_host: string;
    auth_token: string;
    avatar_url: string;
    csat_survey_enabled: boolean;
    disable_branding: boolean;
    enabled_features: string[];
    enabled_languages: EnabledLanguage[];
    locale: string;
    out_of_office_message: string | null;
    portal: unknown;
    pre_chat_form_enabled: boolean;
    pre_chat_form_options: PreChatFormOptions;
    reply_time: string;
    timezone: string;
    utc_off_set: string;
    website_name: string;
    website_token: string;
    welcome_tagline: string | null;
    welcome_title: string | null;
    widget_color: string;
    working_hours: WorkingHourSlot[];
    working_hours_enabled: boolean;
}

export interface WidgetContact {
    id: number;
    name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    identifier?: string | null;
    pubsub_token: string;
    has_email?: boolean;
    has_name?: boolean;
    has_phone_number?: boolean;
}

export interface WidgetGlobalConfig {
    LOGO_THUMBNAIL?: string;
    BRAND_NAME?: string;
    WIDGET_BRAND_URL?: string;
    MAXIMUM_FILE_UPLOAD_SIZE?: number;
    INSTALLATION_NAME?: string;
}

export interface WidgetConfigResponse {
    website_channel_config: WebsiteChannelConfigPayload;
    contact: WidgetContact;
    global_config: WidgetGlobalConfig;
}

// Tương đương `window.chatwootWebChannel` của bản gốc — call-site giữ nguyên tên khóa.
export interface ChannelConfig {
    allowMessagesAfterResolved: boolean;
    apiHost: string;
    avatarUrl: string;
    csatSurveyEnabled: boolean;
    disableBranding: boolean;
    enabledFeatures: string[];
    enabledLanguages: EnabledLanguage[];
    locale: string;
    outOfOfficeMessage: string | null;
    portal: unknown;
    preChatFormEnabled: boolean;
    preChatFormOptions: PreChatFormOptions;
    replyTime: string;
    timezone: string;
    utcOffset: string;
    websiteName: string;
    websiteToken: string;
    welcomeTagline: string | null;
    welcomeTitle: string | null;
    widgetColor: string;
    workingHours: WorkingHour[];
    workingHoursEnabled: boolean;
}

export interface MessageAttachment {
    id?: number | string;
    file_type: string;
    data_url?: string;
    thumb_url?: string;
    status?: string;
}

export interface MessageSender {
    id?: number;
    name?: string;
    available_name?: string;
    avatar_url?: string;
    availability_status?: string;
    type?: string;
}

export interface WidgetMessage {
    id: number | string;
    content?: string | null;
    message_type: number;
    content_type?: string;
    content_attributes?: Record<string, unknown> & {
        deleted?: boolean;
        in_reply_to?: number;
        submitted_email?: string;
        submitted_values?: unknown;
    };
    created_at: number;
    conversation_id?: number;
    attachments?: MessageAttachment[];
    sender?: MessageSender;
    additional_attributes?: { sender_name?: string; sender_avatar_url?: string };
    status?: 'in_progress' | 'sent' | 'failed';
    replyTo?: number | string | null;
    meta?: { error?: string };
    showAvatar?: boolean;
}

export interface ConversationAttributes {
    id: number | string;
    status: string;
}

export interface AvailableAgent {
    id: number;
    name: string;
    avatar_url?: string;
    availability_status?: string;
}

// Cấu hình do SDK gửi vào qua postMessage `config-set`.
export interface AppConfig {
    hideMessageBubble: boolean;
    isWidgetOpen: boolean;
    position: string;
    referrerHost: string;
    showPopoutButton: boolean;
    showUnreadMessagesDialog: boolean;
    widgetColor: string;
    widgetStyle: string;
    darkMode: string;
    welcomeTitle: string;
    welcomeDescription: string;
    availableMessage: string;
    unavailableMessage: string;
    enableFileUpload?: boolean;
    enableEmojiPicker: boolean;
    enableEndConversation: boolean;
}

export interface AttachmentPayload {
    file: File | string;
    thumbUrl: string;
    fileType: string;
}

export interface GroupedMessages {
    date: string;
    messages: WidgetMessage[];
}
