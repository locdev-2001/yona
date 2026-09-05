import { describe, expect, it } from 'vitest';

import { sanitizeAllowedDomains } from './URLHelper';

describe('sanitizeAllowedDomains', () => {
    it('gộp xuống dòng thành dấu phẩy và bỏ khoảng trắng', () => {
        expect(sanitizeAllowedDomains('acme.inc\n  shop.acme.inc \n')).toBe('acme.inc,shop.acme.inc');
    });

    it('hạ chữ thường', () => {
        expect(sanitizeAllowedDomains('ACME.Inc')).toBe('acme.inc');
    });

    it('loại trùng nhưng giữ thứ tự nhập', () => {
        expect(sanitizeAllowedDomains('b.com, a.com, b.com')).toBe('b.com,a.com');
    });

    it('trả chuỗi rỗng khi không có domain nào', () => {
        expect(sanitizeAllowedDomains('')).toBe('');
        expect(sanitizeAllowedDomains(' , , ')).toBe('');
    });
});
