// Cấu hình trang công khai do máy chủ đẩy xuống (xem LandingController + landing.blade.php).
// Lời giới thiệu sản phẩm nằm ở copy.ts; máy chủ chỉ đẩy đường dẫn, thương hiệu,
// nhãn pháp lý và danh sách ngôn ngữ.

interface Meta {
    title: string;
    description: string;
}

export interface LandingLocale {
    code: string;
    label: string;
    url: string;
}

/**
 * Trang nào đang được render. Một bundle cho cả bề mặt, blade đẩy khoá này xuống.
 * `zalo_personal`, `demo`, `demo_thanks` là trang đã bỏ nhưng route còn: hiện trang chủ.
 */
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
        terms: string;
        privacy: string;
    };
    /** Nhãn cột Pháp lý ở footer, lấy từ `lang/{locale}/legal.php`. */
    legalNav: { heading: string; terms: string; privacy: string };
    year: number;
    locale: string;
    locales: LandingLocale[];
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

// `copyright` mang placeholder `:year`; năm lấy từ máy chủ vì nó là dữ liệu của
// trang, không phải của bản dịch.
export function fillPlaceholders(template: string, values: Record<string, string | number>): string {
    return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`:${key}`, String(value)), template);
}
