// Cấu hình trang chủ do máy chủ đẩy xuống (xem LandingController + landing.blade.php).
// Chuỗi đã dịch sẵn ở PHP nên trang không cần bundle i18n của dashboard.

interface Card {
    title: string;
    body: string;
}

export interface FeatureStrings {
    eyebrow: string;
    /** Tiêu đề tách hai dòng: xuống dòng là quyết định bố cục, không để trình duyệt tự ngắt. */
    title_a: string;
    title_b: string;
    body: string;
    cards: Record<string, Card>;
}

export interface LandingStrings {
    meta: { title: string; description: string };
    nav: { features: string; pricing: string; login: string; register: string; dashboard: string; language: string };
    cta: { primary: string; secondary: string; learn: string };
    hero: {
        title_lead: string;
        title_focus: string;
        title_tail: string;
        subtitle: string;
        cta_primary: string;
        cta_secondary: string;
        fine: string;
        cta_dashboard: string;
    };
    showcase: { title_lead: string; title_focus: string; tabs: Record<'inbox' | 'records', string> };
    channels: { eyebrow: string; note: string };
    features: Record<'inbox' | 'zalo' | 'crm', FeatureStrings>;
    flow: {
        eyebrow: string;
        title: string;
        subtitle: string;
        steps: Record<'capture' | 'qualify' | 'nurture' | 'close', { title: string; description: string }>;
    };
    rules: {
        eyebrow: string;
        title: string;
        items: Record<'dedupe' | 'draft' | 'source' | 'respect', { title: string; description: string }>;
    };
    pricing: {
        title: string;
        subtitle: string;
        plan: string;
        price: string;
        unit: string;
        points: Record<'unlimited' | 'no_card' | 'notice', string>;
        cta: string;
        fine: string;
    };
    closing: { title: string; subtitle: string; cta_primary: string; cta_secondary: string };
    footer: { tagline: string; copyright: string; product: string; account: string; language: string; note: string };
}

export interface LandingLocale {
    code: string;
    label: string;
    url: string;
}

export interface LandingConfig {
    brand: { name: string; logo: string };
    isAuthenticated: boolean;
    urls: { home: string; login: string; register: string; dashboard: string };
    strings: LandingStrings;
    year: number;
    locale: string;
    locales: LandingLocale[];
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
