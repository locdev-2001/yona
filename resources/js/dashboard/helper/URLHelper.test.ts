import { describe, expect, it } from 'vitest';

import { composeConversationUrl, conversationListPageURL, conversationUrl, sanitizeAllowedDomains } from './URLHelper';

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
        [{ filters: { inboxIds: [16] } }, '/app/accounts/2/inbox/new?inbox=16'],
        [{ filters: { labels: ['khách vip'] }, teamId: 4 }, '/app/accounts/2/inbox/new?team_id=4&label=kh%C3%A1ch+vip'],
    ])('%o → %s', (params, expected) => {
        expect(composeConversationUrl({ accountId: 2, ...params })).toBe(expected);
    });
});

describe('conversationUrl', () => {
    it.each([
        [{}, '/app/accounts/2/conversations/540'],
        [{ filters: { inboxIds: [5], labels: ['a', 'b'] } }, '/app/accounts/2/conversations/540?inbox=5&label=a&label=b'],
        [{ teamId: 3, filters: { inboxIds: [5] } }, '/app/accounts/2/team/3/conversations/540?inbox=5'],
        [{ conversationType: 'mention' }, '/app/accounts/2/mentions/conversations/540'],
    ])('%o → %s', (params, expected) => {
        expect(conversationUrl({ accountId: 2, id: 540, ...params })).toBe(expected);
    });
});

describe('conversationListPageURL', () => {
    it.each([
        [{}, '/app/accounts/2/dashboard'],
        [{ filters: { inboxIds: [], labels: [] } }, '/app/accounts/2/dashboard'],
        [{ filters: { inboxIds: [5] } }, '/app/accounts/2/conversations?inbox=5'],
        [{ filters: { labels: ['cực dàng'] } }, '/app/accounts/2/conversations?label=c%E1%BB%B1c+d%C3%A0ng'],
        [{ teamId: 3 }, '/app/accounts/2/team/3'],
        [{ conversationType: 'mention' }, '/app/accounts/2/mentions/conversations'],
    ])('%o → %s', (params, expected) => {
        expect(conversationListPageURL({ accountId: 2, ...params })).toBe(expected);
    });
});
