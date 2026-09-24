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
}

export interface GlobalConfig {
    installationName: string;
    logo: string;
    logoDark: string;
    logoThumbnail: string;
    termsURL: string;
    privacyURL: string;
    // App id của Meta — kênh Facebook/Instagram chỉ bật khi cấu hình (như
    // biến cấu hình toàn cục fbAppId của bản trước).
    fbAppId?: string;
    fbApiVersion?: string;
    // Khoá công khai VAPID cho Web Push (thay biến cấu hình toàn cục vapidPublicKey
    // của bản gốc); null khi máy chủ không có khoá — giao diện ẩn phần đẩy.
    vapidPublicKey?: string | null;
}

export interface SharedPageProps {
    auth: { user: AuthUser | null };
    globalConfig: GlobalConfig;
    flash: { alert: string | null };
    [key: string]: unknown;
}
