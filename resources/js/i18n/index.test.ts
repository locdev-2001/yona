import { afterEach, describe, expect, it } from 'vitest';

import { locales } from './generated';
import { INSTALLATION_NAME_PARAM, fillInstallationName, setLocale, t } from './index';

const INSTALLATION_NAME_PLACEHOLDER = `{${INSTALLATION_NAME_PARAM}}`;

function leafKeys(node: Record<string, unknown>, prefix = ''): string[] {
    return Object.entries(node).flatMap(([key, value]) => {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'string') return [path];

        return value && typeof value === 'object' ? leafKeys(value as Record<string, unknown>, path) : [];
    });
}

describe('t()', () => {
    it('trả literal của vue-i18n về ký tự thật', () => {
        setLocale('vi');
        // Chuỗi lang: "example{'@'}companyname.com" — `@` bọc literal.
        expect(t('LOGIN.EMAIL.PLACEHOLDER')).toBe('example@companyname.com');
    });

    it('vẫn nội suy tham số bình thường', () => {
        setLocale('en');
        expect(t('LOGIN.EMAIL.PLACEHOLDER')).toBe('example@companyname.com');
    });

    it('trả về key khi không có chuỗi', () => {
        expect(t('KHONG.CO.KHOA.NAY')).toBe('KHONG.CO.KHOA.NAY');
    });
});

// Câu nói về chính sản phẩm viết `{installationName}` trong lang; t() tự điền
// để không màn nào phải nhớ gọi thêm hàm thay tên.
describe('tên cài đặt', () => {
    afterEach(() => {
        delete document.documentElement.dataset.installationName;
    });

    it('điền chỗ trống bằng tên đọc từ <html data-installation-name>', () => {
        document.documentElement.dataset.installationName = 'Yona';
        setLocale('vi');

        expect(t('LOGIN.TITLE')).toBe('Đăng nhập Yona');
    });

    it('không có attribute thì dùng tên mặc định Yona', () => {
        setLocale('vi');

        expect(t('LOGIN.TITLE')).toBe('Đăng nhập Yona');
    });

    it('tôn trọng tên cài đặt tuỳ biến', () => {
        document.documentElement.dataset.installationName = 'Acme Chat';
        setLocale('en');

        expect(t('LOGIN.TITLE')).toBe('Login to Acme Chat');
    });

    it('tham số truyền tay thắng tên cài đặt', () => {
        document.documentElement.dataset.installationName = 'Acme Chat';
        setLocale('en');

        expect(t('LOGIN.TITLE', { [INSTALLATION_NAME_PARAM]: 'Z' })).toBe('Login to Z');
    });

    it.each(['vi', 'en'])('mọi khoá của bundle %s qua t() không còn chỗ trống tên cài đặt', locale => {
        setLocale(locale);
        const leaked = leafKeys(locales[locale]).filter(key =>
            [0, 1, 2].some(count => t(key, { n: count }).includes(INSTALLATION_NAME_PLACEHOLDER)),
        );

        expect(leaked).toEqual([]);
    });

    it('chuỗi không đi qua t() điền được bằng fillInstallationName', () => {
        expect(fillInstallationName('Powered by {installationName}', 'Acme')).toBe('Powered by Acme');
    });

    it('điều khoản khi đăng ký trỏ đúng URL cấu hình', () => {
        setLocale('vi');
        const html = t('REGISTER.TERMS_ACCEPT', {
            termsURL: 'https://yona.vn/dieu-khoan',
            privacyURL: 'https://yona.vn/chinh-sach-rieng-tu',
        });

        expect(html).toContain('<a href="https://yona.vn/dieu-khoan">');
        expect(html).toContain('<a href="https://yona.vn/chinh-sach-rieng-tu">');
    });
});
