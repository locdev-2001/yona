// Cấu hình trang chủ do máy chủ đẩy xuống (xem LandingController + landing.blade.php).
// Chuỗi đã dịch sẵn ở PHP nên trang không cần bundle i18n của dashboard.

export interface LandingStrings {
    nav: { features: string; login: string; register: string; dashboard: string };
    hero: {
        eyebrow: string;
        title: string;
        subtitle: string;
        cta_primary: string;
        cta_secondary: string;
        cta_dashboard: string;
        hint: string;
    };
    features: {
        title: string;
        subtitle: string;
        [key: string]: string | { title: string; description: string };
    };
    footer: { tagline: string; copyright: string };
    appearance: { label: string; light: string; dark: string; auto: string };
}

export interface LandingConfig {
    brand: { name: string; logo: string; logo_dark: string };
    isAuthenticated: boolean;
    urls: { home: string; login: string; register: string; dashboard: string };
    strings: LandingStrings;
    year: number;
}

declare global {
    interface Window {
        landingConfig?: LandingConfig;
    }
}

export function landingConfig(): LandingConfig {
    const config = window.landingConfig;

    if (!config) {
        throw new Error('Thiếu window.landingConfig — blade phải đẩy cấu hình xuống trước khi mount.');
    }

    return config;
}

// `copyright` dùng placeholder `:year` của Laravel; máy chủ không thay sẵn vì
// năm là dữ liệu của trang, không phải của bản dịch.
export function fillPlaceholders(template: string, values: Record<string, string | number>): string {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`:${key}`, String(value)), template);
}
