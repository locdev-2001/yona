import { afterEach, describe, expect, it } from 'vitest';

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

// "Chatwoot" trong chuỗi gốc là chỗ trống cho tên cài đặt. Bản gốc thay ở từng
// nơi gọi nên màn nào quên gọi là lộ tên ra trước mặt người dùng.
describe('tên cài đặt', () => {
    afterEach(() => {
        delete document.documentElement.dataset.installationName;
    });

    it('thay chỗ trống bằng tên đọc từ <html data-installation-name>', () => {
        document.documentElement.dataset.installationName = 'Yona';
        setLocale('vi');

        const chuoi = t('INBOX_MGMT.ADD.AUTH.DESC');
        expect(chuoi).toContain('Yona');
        expect(chuoi).not.toContain('Chatwoot');
    });

    it('không có attribute thì vẫn không để lọt tên gốc', () => {
        setLocale('vi');

        expect(t('INBOX_MGMT.ADD.AUTH.DESC')).not.toContain('Chatwoot');
    });

    it('tôn trọng tên cài đặt tuỳ biến', () => {
        document.documentElement.dataset.installationName = 'Acme Chat';
        setLocale('en');

        expect(t('LOGIN.TITLE')).toContain('Acme Chat');
    });
});
