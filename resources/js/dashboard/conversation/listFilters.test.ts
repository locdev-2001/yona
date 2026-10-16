import { describe, expect, it } from 'vitest';
import {
    countActiveListFilters,
    readListFilterQuery,
    readPersistedListFilters,
    withListFilterQuery,
} from './listFilters';

describe('readListFilterQuery', () => {
    it.each([
        { search: '', expected: { inboxIds: [], labels: [] } },
        { search: '?inbox=5', expected: { inboxIds: [5], labels: [] } },
        { search: '?label=a&label=b', expected: { inboxIds: [], labels: ['a', 'b'] } },
        { search: '?inbox=5&label=cuc-dang&label=yona', expected: { inboxIds: [5], labels: ['cuc-dang', 'yona'] } },
        { search: '?inbox=abc&inbox=0&inbox=-3', expected: { inboxIds: [], labels: [] } },
        { search: '?inbox=7&inbox=5', expected: { inboxIds: [7], labels: [] } },
        { search: '?label=b&label=a&label=b&label=%20', expected: { inboxIds: [], labels: ['b', 'a'] } },
        { search: '?label=c%E1%BB%B1c+d%C3%A0ng', expected: { inboxIds: [], labels: ['cực dàng'] } },
        { search: '?q=an&messageId=9', expected: { inboxIds: [], labels: [] } },
    ])('$search', ({ search, expected }) => {
        expect(readListFilterQuery(search)).toEqual(expected);
    });
});

describe('withListFilterQuery', () => {
    it.each([
        {
            name: 'lặp khoá nhãn, không dùng []',
            from: '/app/accounts/1/conversations',
            query: { inboxIds: [5], labels: ['a', 'b'] },
            expected: '/app/accounts/1/conversations?inbox=5&label=a&label=b',
        },
        {
            name: 'giữ khoá khác, thay kênh/nhãn cũ',
            from: '/app/accounts/1/conversations/540?q=an&inbox=3&label=x&messageId=9',
            query: { inboxIds: [5], labels: [] },
            expected: '/app/accounts/1/conversations/540?q=an&messageId=9&inbox=5',
        },
        {
            name: 'bỏ hết bộ lọc thì không còn dấu ?',
            from: '/app/accounts/1/conversations?inbox=5&label=a',
            query: { inboxIds: [], labels: [] },
            expected: '/app/accounts/1/conversations',
        },
        {
            name: 'mã hoá nhãn có dấu và khoảng trắng',
            from: '/app/accounts/1/conversations',
            query: { labels: ['cực dàng'] },
            expected: '/app/accounts/1/conversations?label=c%E1%BB%B1c+d%C3%A0ng',
        },
    ])('$name', ({ from, query, expected }) => {
        expect(withListFilterQuery(from, query)).toBe(expected);
    });

    it('đọc lại đúng thứ vừa ghi', () => {
        const query = { inboxIds: [5], labels: ['cực dàng', 'yona'] };
        const url = withListFilterQuery('/app/accounts/1/conversations?q=an', query);

        expect(readListFilterQuery(new URL(url, 'http://local').search)).toEqual(query);
    });
});

describe('readPersistedListFilters', () => {
    it.each([
        { settings: undefined, expected: { status: 'open', sortBy: 'last_activity_at_desc' } },
        { settings: { status: 'resolved', order_by: 'priority_desc' }, expected: { status: 'resolved', sortBy: 'priority_desc' } },
        { settings: { status: 'bogus', order_by: 'bogus' }, expected: { status: 'open', sortBy: 'last_activity_at_desc' } },
        { settings: { status: 'all' }, expected: { status: 'all', sortBy: 'last_activity_at_desc' } },
    ])('$settings', ({ settings, expected }) => {
        expect(readPersistedListFilters(settings)).toEqual(expected);
    });
});

describe('countActiveListFilters', () => {
    const base = { inboxIds: [], labels: [], status: 'open' as const, sortBy: 'last_activity_at_desc' };

    it.each([
        { filters: base, expected: 0 },
        { filters: { ...base, sortBy: 'priority_desc' }, expected: 0 },
        { filters: { ...base, inboxIds: [5] }, expected: 1 },
        { filters: { ...base, labels: ['a', 'b'] }, expected: 2 },
        { filters: { ...base, inboxIds: [5], labels: ['a'], status: 'resolved' as const }, expected: 3 },
    ])('$expected', ({ filters, expected }) => {
        expect(countActiveListFilters(filters)).toBe(expected);
    });
});
