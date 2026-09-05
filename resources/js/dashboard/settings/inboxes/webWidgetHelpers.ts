// Phần logic thuần của nhánh kênh Website (Website.vue + Settings.vue):
// dựng payload gửi API, bật/tắt cờ tính năng và lưu tuỳ chọn bong bóng widget
// vào localStorage. Tách khỏi component để test được và để mọi màn dùng chung.
const WIDGET_BUILDER_STORE_PREFIX = 'widgetBubble_';

export const WEB_WIDGET_FEATURE_FLAGS = [
    'attachments',
    'emoji_picker',
    'end_conversation',
    'use_inbox_avatar_for_bot',
] as const;

export const ALLOW_MOBILE_WEBVIEW_FLAG = 'allow_mobile_webview';

export interface WebsiteChannelForm {
    inboxName: string;
    channelWebsiteUrl: string;
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
            website_url: form.channelWebsiteUrl,
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

export interface WidgetBubbleSettings {
    position: string;
    type: string;
    launcherTitle: string;
}

export const DEFAULT_WIDGET_BUBBLE_SETTINGS: WidgetBubbleSettings = {
    position: 'right',
    type: 'standard',
    launcherTitle: '',
};

const widgetBubbleStoreKey = (inboxId: number) => `${WIDGET_BUILDER_STORE_PREFIX}${inboxId}`;

export function readWidgetBubbleSettings(inboxId: number): WidgetBubbleSettings {
    try {
        const raw = window.localStorage.getItem(widgetBubbleStoreKey(inboxId));
        const parsed = typeof raw === 'string' ? (JSON.parse(raw) as Partial<WidgetBubbleSettings>) : null;
        if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_WIDGET_BUBBLE_SETTINGS };

        return {
            position: parsed.position || DEFAULT_WIDGET_BUBBLE_SETTINGS.position,
            type: parsed.type || DEFAULT_WIDGET_BUBBLE_SETTINGS.type,
            launcherTitle: parsed.launcherTitle || DEFAULT_WIDGET_BUBBLE_SETTINGS.launcherTitle,
        };
    } catch {
        return { ...DEFAULT_WIDGET_BUBBLE_SETTINGS };
    }
}

export function writeWidgetBubbleSettings(inboxId: number, settings: WidgetBubbleSettings): void {
    const key = widgetBubbleStoreKey(inboxId);
    try {
        window.localStorage.setItem(key, JSON.stringify(settings));
        window.localStorage.setItem(`${key}:ts`, Date.now().toString());
    } catch {
        /* quota/chế độ ẩn danh — bỏ qua như LocalStorage.set gốc */
    }
}
