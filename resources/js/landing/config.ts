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

interface Meta {
    title: string;
    description: string;
}

export interface Item {
    title: string;
    description: string;
}

/** Trang đặt lịch demo: một màn hình, một khối form. */
export interface DemoStrings {
    meta: Meta;
    eyebrow: string;
    title: string;
    lead: string;
    promise: Record<'connect' | 'fit' | 'callback', string>;
    form: {
        legend: string;
        name_label: string;
        name_placeholder: string;
        phone_label: string;
        phone_placeholder: string;
        phone_hint: string;
        phone_invalid: string;
        note_label: string;
        note_placeholder: string;
        honeypot_label: string;
        submit: string;
        required_note: string;
        privacy: string;
        failed: string;
    };
    alt: { title: string; hotline: string; zalo: string; note: string };
    thanks: {
        meta: Meta;
        eyebrow: string;
        title: string;
        lead: string;
        next: Record<'when' | 'how' | 'prepare', string>;
        cta_home: string;
        cta_zalo: string;
    };
}

/** Trang một-kênh cho Zalo cá nhân. */
export interface ZaloPageStrings {
    meta: Meta;
    hero: { eyebrow: string; title_a: string; title_b: string; lead: string; cta_primary: string; cta_secondary: string };
    problem: { eyebrow: string; title: string; items: Record<'mixed' | 'shared' | 'blind' | 'lost', Item> };
    solution: FeatureStrings;
    caps: {
        eyebrow: string;
        title: string;
        note: string;
        items: Record<'recall' | 'reaction' | 'group' | 'rich', Item>;
    };
    risk: {
        eyebrow: string;
        title: string;
        body: string;
        points: Record<'unofficial' | 'ban' | 'keep' | 'oa', string>;
    };
    closing: { title: string; lead: string; cta_primary: string; cta_secondary: string };
}

export interface LandingStrings {
    meta: Meta;
    nav: {
        features: string;
        pricing: string;
        login: string;
        register: string;
        dashboard: string;
        language: string;
        menu: string;
        menu_close: string;
        demo: string;
        zalo: string;
    };
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
    /** `coming_soon` mang placeholder `:channels`, tên kênh lấy từ danh sách kênh của section. */
    channels: { eyebrow: string; coming_soon: string; note: string };
    features: Record<'inbox' | 'zalo' | 'crm', FeatureStrings>;
    flow: {
        eyebrow: string;
        title: string;
        subtitle: string;
        steps: Record<'capture' | 'assign' | 'reply' | 'resolve', { title: string; description: string }>;
    };
    rules: {
        eyebrow: string;
        title: string;
        items: Record<'dedupe' | 'draft' | 'source' | 'inbound', { title: string; description: string }>;
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
    demo: DemoStrings;
    zalo_page: ZaloPageStrings;
}

export interface LandingLocale {
    code: string;
    label: string;
    url: string;
}

/** Trang nào đang được render. Một bundle cho cả bề mặt, blade đẩy khoá này xuống. */
export type LandingPage = 'home' | 'zalo_personal' | 'demo' | 'demo_thanks' | 'terms' | 'privacy' | 'not_found';

/**
 * Một mục của văn bản pháp lý. Đoạn văn, danh sách và ghi chú cuối đều tuỳ chọn:
 * mục ngắn chỉ có một đoạn, mục liệt kê quyền thì có đoạn dẫn rồi danh sách.
 */
export interface LegalSection {
    heading: string;
    body?: Record<string, string>;
    points?: Record<string, string>;
    note?: string;
}

/** Điều khoản hoặc chính sách riêng tư, máy chủ đã điền sẵn ngày cập nhật. */
export interface LegalDocument {
    eyebrow: string;
    title: string;
    updated: string;
    lead: string;
    sections: Record<string, LegalSection>;
    related: { heading: string; label: string; href: string };
}

export interface NotFoundStrings {
    eyebrow: string;
    title: string;
    lead: string;
    home: string;
}

/**
 * Form gửi kiểu native: server validate rồi redirect kèm lỗi và giá trị cũ.
 * Không có state form trong React, nên không có lớp xử lý lỗi mạng ở client và
 * tắt JS vẫn gửi được.
 */
export interface LandingForm {
    action: string;
    csrf: string;
    errors: Record<string, string[]>;
    old: { name: string; phone: string; note: string };
    failed: boolean;
}

export interface LandingConfig {
    page: LandingPage;
    meta: Meta;
    brand: { name: string; logo: string };
    isAuthenticated: boolean;
    urls: {
        home: string;
        login: string;
        register: string;
        dashboard: string;
        demo: string;
        zalo: string;
        terms: string;
        privacy: string;
    };
    /** Rỗng khi chưa cấu hình số thật: trang ẩn khối liên hệ thay vì bày số không ai bắt máy. */
    contact: { hotline: string | null; zaloUrl: string | null };
    strings: LandingStrings;
    /** Nhãn cột Pháp lý ở footer, lấy từ `lang/{locale}/legal.php`. */
    legalNav: { heading: string; terms: string; privacy: string };
    year: number;
    locale: string;
    locales: LandingLocale[];
    form?: LandingForm;
    legalDocument?: LegalDocument;
    notFound?: NotFoundStrings;
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
