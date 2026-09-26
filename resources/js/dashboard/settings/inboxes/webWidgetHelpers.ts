// Phần logic thuần của nhánh kênh Website (Website.vue + Settings.vue): dựng
// payload gửi API và bật/tắt cờ tính năng. Tách khỏi component để test được
// và để mọi màn dùng chung. Tuỳ chọn bong bóng widget (vị trí, kiểu, chữ
// launcher) từng lưu ở localStorage tại đây đã chuyển hẳn lên server — xem
// `widget_settings.appearance` và màn `widget-builder/`.
export const WEB_WIDGET_FEATURE_FLAGS = [
    'attachments',
    'emoji_picker',
    'end_conversation',
    'use_inbox_avatar_for_bot',
] as const;

export const ALLOW_MOBILE_WEBVIEW_FLAG = 'allow_mobile_webview';

// Widget in dòng giới thiệu thành văn bản thuần; giới hạn khớp luật max:255 phía server.
export const WELCOME_TAGLINE_MAX_LENGTH = 255;

export interface WebsiteChannelForm {
    inboxName: string;
    channelWidgetColor: string;
    channelWelcomeTitle: string;
    channelWelcomeTagline: string;
    greetingEnabled: boolean;
    greetingMessage: string;
}

export function buildWebsiteChannelPayload(form: WebsiteChannelForm): Record<string, unknown> {
    return {
        name: form.inboxName.trim(),
        greeting_enabled: form.greetingEnabled,
        greeting_message: form.greetingMessage,
        channel: {
            type: 'web_widget',
            widget_color: form.channelWidgetColor,
            welcome_title: form.channelWelcomeTitle,
            welcome_tagline: form.channelWelcomeTagline,
        },
    };
}

// toggleInput của Settings.vue — checkbox cờ tính năng bật/tắt một phần tử.
export function toggleFeatureFlag(selected: string[], flag: string): string[] {
    return selected.includes(flag) ? selected.filter(item => item !== flag) : [...selected, flag];
}
