export interface AuthUser {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
    availability: number;
    ui_settings: Record<string, unknown>;
    type: string | null;
    avatar_url: string;
    message_signature: string | null;
    pubsub_token: string;
    has_push_subscription?: boolean;
}

export interface AvailableLocale {
    name: string;
    iso_639_1_code: string;
}

export interface GlobalConfig {
    installationName: string;
    logo: string;
    logoDark: string;
    logoThumbnail: string;
    termsURL: string;
    privacyURL: string;
    availableLocales: AvailableLocale[];
    // App id của Meta — kênh Facebook/Instagram chỉ bật khi cấu hình (như
    // biến cấu hình toàn cục fbAppId của bản trước).
    fbAppId?: string;
    fbApiVersion: string;
    // Khoá công khai VAPID cho Web Push (thay biến cấu hình toàn cục vapidPublicKey
    // của bản gốc); null khi máy chủ không có khoá — giao diện ẩn phần đẩy.
    vapidPublicKey?: string | null;
}

export interface SharedPageProps {
    auth: { user: AuthUser | null };
    globalConfig: GlobalConfig;
    flash: { alert: string | null };
    // Cạnh hiển thị sticker (px CSS), cấu hình ở máy chủ.
    stickerDisplaySize?: number;
    [key: string]: unknown;
}
