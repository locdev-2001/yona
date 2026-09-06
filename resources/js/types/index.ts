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
    signupEnabled: boolean;
    isMfaEnabled: boolean;
    termsURL: string;
    privacyURL: string;
}

export interface SharedPageProps {
    auth: { user: AuthUser | null };
    globalConfig: GlobalConfig;
    flash: { alert: string | null };
    [key: string]: unknown;
}
