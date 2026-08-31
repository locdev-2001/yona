export interface AuthUser {
    id: number;
    name: string;
    display_name: string | null;
    email: string;
    availability: number;
    ui_settings: Record<string, unknown>;
}

export interface GlobalConfig {
    installationName: string;
    logo: string;
    logoDark: string;
    signupEnabled: boolean;
    termsURL: string;
    privacyURL: string;
}

export interface SharedPageProps {
    auth: { user: AuthUser | null };
    globalConfig: GlobalConfig;
    flash: { alert: string | null };
    [key: string]: unknown;
}
