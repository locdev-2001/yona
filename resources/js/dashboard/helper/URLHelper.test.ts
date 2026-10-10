import { describe, expect, it } from 'vitest';

import { composeConversationUrl, sanitizeAllowedDomains } from './URLHelper';

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

describe('composeConversationUrl', () => {
    it.each([
        [{}, '/app/accounts/2/inbox/new'],
        [{ contactId: 9 }, '/app/accounts/2/inbox/new?contact_id=9'],
        [{ inboxId: 16 }, '/app/accounts/2/inbox/new?inbox_id=16'],
        [{ label: 'khách vip', teamId: 4 }, '/app/accounts/2/inbox/new?team_id=4&label=kh%C3%A1ch+vip'],
    ])('%o → %s', (params, expected) => {
        expect(composeConversationUrl({ accountId: 2, ...params })).toBe(expected);
    });
});
