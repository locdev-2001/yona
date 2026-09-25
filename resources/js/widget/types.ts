import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

// Kiểu dữ liệu của widget — bám đúng phản hồi `/api/v1/widget/*`.

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

// Một sticker trong danh mục của kênh (`/config` → `stickers`).
export interface WidgetSticker {
    id: string;
    image_url: string;
    pack_id: string | null;
    label: string | null;
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
    portal: { slug: string; name: string; default_locale: string; locales: string[] } | null;
    pre_chat_form_enabled: boolean;
    pre_chat_form_options: PreChatFormOptions;
    // Hạn thu hồi tin của khách (giây) — chính sách của kênh, máy chủ thực thi.
    recall_window?: number;
    reply_time: string;
    stickers?: WidgetSticker[];
    timezone: string;
    utc_off_set: string;
    website_name: string;
    website_token: string;
    welcome_tagline: string | null;
    welcome_title: string | null;
    widget_color: string;
    widget_settings?: WidgetSettingsConfig;
    working_hours: WorkingHourSlot[];
    working_hours_enabled: boolean;
}

export interface WidgetContact {
    id: number | null;
    name?: string | null;
    email?: string | null;
    phone_number?: string | null;
    identifier?: string | null;
    pubsub_token: string | null;
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

// Cấu hình kênh widget đã map sang camelCase.
export interface PortalConfig {
    slug: string;
    name: string;
    defaultLocale: string;
    locales: string[];
}

export type OtherChannelKind = 'zalo' | 'messenger' | 'telegram' | 'whatsapp' | 'instagram' | 'tiktok' | 'hotline' | 'email' | 'custom';

/** `widget_settings` của hộp thư (App\Support\Widget\WidgetSettings), đã trộn mặc định. */
export interface WidgetSettingsConfig {
    appearance: { launcher: 'round' | 'pill'; launcher_label: string | null; greeting: string | null };
    home: { blocks: { recent_conversation: boolean; help: boolean; other_channels: boolean; custom_links: boolean; request: boolean } };
    other_channels: { kind: OtherChannelKind; label: string | null; value: string; enabled: boolean }[];
    custom_links: { label: string; url: string }[];
    capture: { phone: boolean; email: boolean };
    expanded_enabled: boolean;
}

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
    portal: PortalConfig | null;
    widgetSettings: WidgetSettingsConfig;
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
    file_size?: number;
    // Chỉ có ở tệp đang tải lên: phần trăm đã tải để vẽ tiến trình, và tên tệp gốc
    // (URL xem trước là blob nên không suy ra được tên).
    progress?: number;
    file_name?: string;
}

// Sticker đã lưu: máy chủ tra danh mục và ghi lại ảnh; tin tạm phía khách chỉ có mã.
export type MessageSticker = string | { id?: string | number; url?: string; thumbnail?: string };

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
        sticker?: MessageSticker;
        items?: unknown[];
    };
    created_at: number;
    conversation_id?: number;
    attachments?: MessageAttachment[];
    sender?: MessageSender;
    additional_attributes?: { sender_name?: string; sender_avatar_url?: string };
    // 'in_progress' là trạng thái tạm phía widget; còn lại do máy chủ trả.
    status?: 'in_progress' | 'sent' | 'delivered' | 'read' | 'failed';
    replyTo?: number | string | null;
    meta?: { error?: string };
}

// Bản ghi campaign của `GET /api/v1/widget/campaigns` (`id` = display_id).
export interface WidgetCampaign {
    id: number;
    message: string;
    trigger_only_during_business_hours: boolean;
    trigger_rules?: { url?: string; time_on_page?: number };
    sender?: MessageSender | null;
}

// Dạng đã rút gọn cho luật kích hoạt (campaignHelper.formatCampaigns).
export interface FormattedCampaign {
    id: number;
    triggerOnlyDuringBusinessHours: boolean;
    timeOnPage?: number;
    url?: string;
}

// Nhân viên đang phụ trách hội thoại, đúng những trường widget được thấy.
export interface ConversationAssignee {
    id: number;
    name: string;
    avatar_url: string;
    // Trạng thái trực của chính nhân viên này trong account, kể cả khi họ không phải
    // thành viên hộp thư (danh sách thành viên không có họ).
    availability_status?: string | null;
}

// Người đang gõ bên phía hộp thư (nhân viên hoặc bot), lấy từ sự kiện đang gõ.
export interface TypingAgent {
    name: string;
    avatar_url?: string | null;
}

export interface ConversationAttributes {
    id: number | string;
    status: string;
    // Mốc tạo hội thoại (giây Unix): màn đánh giá tính "đã hỗ trợ trong bao lâu".
    createdAt?: number | null;
    assignee?: ConversationAssignee | null;
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

export interface PositionedMessage {
    message: WidgetMessage;
    position: MessageGroupPosition;
}

// Tin trong một ngày, đã gom thành các nhóm liên tiếp cùng người gửi.
export interface MessagesOfDay {
    date: string;
    groups: PositionedMessage[][];
}

// Chính sách nhắn tin của kênh mà `/config` báo về.
export interface ChannelMessagingPolicy {
    recallWindowSeconds: number;
    stickers: WidgetSticker[];
}
