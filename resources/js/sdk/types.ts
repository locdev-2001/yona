import type { BubbleDesign, DarkMode, WidgetDesign } from './constants/design';

export type SdkUserAttributes = Record<string, unknown>;

// Tuỳ chọn trang khách hàng đặt vào `window.yonaSettings` trước khi gọi run().
export type SdkSettings = {
    locale?: string;
    baseDomain?: string;
    useBrowserLanguage?: boolean;
    hideMessageBubble?: boolean;
    position?: string;
    type?: string;
    launcherTitle?: string;
    showPopoutButton?: boolean;
    showUnreadMessagesDialog?: boolean;
    widgetStyle?: string;
    darkMode?: string;
    welcomeTitle?: string;
    welcomeDescription?: string;
    availableMessage?: string;
    unavailableMessage?: string;
    enableFileUpload?: boolean;
    enableEmojiPicker?: boolean;
    enableEndConversation?: boolean;
};

// API công khai — trang khách hàng gọi đúng những tên này, không được đổi.
export type SdkInstance = {
    baseUrl: string;
    baseDomain?: string;
    hasLoaded: boolean;
    hideMessageBubble: boolean;
    isOpen: boolean;
    position: 'left' | 'right';
    websiteToken: string;
    locale?: string;
    useBrowserLanguage: boolean;
    type: BubbleDesign;
    launcherTitle: string;
    showPopoutButton: boolean;
    showUnreadMessagesDialog: boolean;
    widgetStyle: WidgetDesign;
    resetTriggered: boolean;
    darkMode: DarkMode;
    welcomeTitle: string;
    welcomeDescription: string;
    availableMessage: string;
    unavailableMessage: string;
    enableFileUpload?: boolean;
    enableEmojiPicker: boolean;
    enableEndConversation: boolean;
    identifier?: string | number;
    user?: SdkUserAttributes;
    toggle(state?: 'open' | 'close'): void;
    toggleBubbleVisibility(visibility: 'hide' | 'show'): void;
    popoutChatWindow(): void;
    setUser(identifier: string | number, user: SdkUserAttributes): void;
    setCustomAttributes(customAttributes?: Record<string, unknown>): void;
    deleteCustomAttribute(customAttribute?: string): void;
    setConversationCustomAttributes(customAttributes?: Record<string, unknown>): void;
    deleteConversationCustomAttribute(customAttribute?: string): void;
    setLabel(label?: string): void;
    removeLabel(label?: string): void;
    setLocale(locale?: string): void;
    setColorScheme(darkMode?: string): void;
    reset(): void;
};

export type RunOptions = { baseUrl: string; websiteToken: string };

declare global {
    interface Window {
        $yona: SdkInstance;
        yonaSettings?: SdkSettings;
        yonaSDK: { run: (options: RunOptions) => void };
        playAudioAlert?: () => void;
        Turbolinks?: unknown;
    }
}
