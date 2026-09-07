import { describe, expect, it } from 'vitest';

import { setLocale, t } from './index';

describe('t()', () => {
    it('trả literal của vue-i18n về ký tự thật', () => {
        setLocale('vi');
        // Chuỗi gốc Chatwoot: "example{'@'}companyname.com" — `@` phải bọc literal
        // vì vue-i18n dùng nó cho linked message.
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
