import { locales } from '../../i18n/generated';
import type { LandingConfig, LandingPage, LandingStrings, LegalDocument, NotFoundStrings } from '../config';

type LegalBundle = {
    nav: LandingConfig['legalNav'];
    eyebrow: string;
    updated: string;
    related: string;
    terms: Omit<LegalDocument, 'eyebrow' | 'updated' | 'related'> & { updated_on: string };
    privacy: Omit<LegalDocument, 'eyebrow' | 'updated' | 'related'> & { updated_on: string };
};

const URLS: LandingConfig['urls'] = {
    home: 'https://yona.test/',
    login: 'https://yona.test/app/login',
    register: 'https://yona.test/app/auth/signup',
    dashboard: 'https://yona.test/app',
    demo: 'https://yona.test/dat-lich-demo',
    zalo: 'https://yona.test/zalo-ca-nhan',
    terms: 'https://yona.test/dieu-khoan',
    privacy: 'https://yona.test/chinh-sach-rieng-tu',
};

/** Bản dịch pháp lý thật từ bundle sinh ra: test đọc đúng chữ trang đang hiển thị. */
export function legalBundle(locale: 'vi' | 'en' = 'vi'): LegalBundle {
    return locales[locale].LEGAL as LegalBundle;
}

/** Dựng văn bản pháp lý đúng như LegalPagesController đẩy xuống. */
export function legalDocumentFixture(key: 'terms' | 'privacy', locale: 'vi' | 'en' = 'vi'): LegalDocument {
    const legal = legalBundle(locale);
    const { updated_on: updatedOn, ...document } = legal[key];
    const counterpart = key === 'terms' ? 'privacy' : 'terms';

    return {
        ...document,
        eyebrow: legal.eyebrow,
        updated: legal.updated.replace(':date', updatedOn),
        related: { heading: legal.related, label: legal.nav[counterpart], href: URLS[counterpart] },
    };
}

export function landingConfigFixture(page: LandingPage, overrides: Partial<LandingConfig> = {}): LandingConfig {
    return {
        page,
        meta: { title: 'Yona', description: '' },
        brand: { name: 'Yona', logo: '/brand-assets/logo.png' },
        isAuthenticated: false,
        urls: URLS,
        contact: { hotline: null, zaloUrl: null },
        strings: locales.vi.LANDING as LandingStrings,
        legalNav: legalBundle().nav,
        year: 2026,
        locale: 'vi',
        locales: [
            { code: 'vi', label: 'Tiếng Việt', url: 'https://yona.test/?locale=vi' },
            { code: 'en', label: 'English', url: 'https://yona.test/?locale=en' },
        ],
        ...overrides,
    };
}

export function notFoundFixture(locale: 'vi' | 'en' = 'vi'): NotFoundStrings {
    return (locales[locale].ERROR_PAGES as { not_found: NotFoundStrings }).not_found;
}
