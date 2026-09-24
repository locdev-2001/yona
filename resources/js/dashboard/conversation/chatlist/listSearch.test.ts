import { describe, expect, it } from 'vitest';

import { keepSearchMatches, nextSearchMatches, readListSearchQuery, withListSearchQuery } from './listSearch';

describe('listSearch', () => {
    it('đọc từ khoá từ query string, bỏ khoảng trắng thừa', () => {
        expect(readListSearchQuery('?q=%20Lan%20Nguy%E1%BB%85n%20&messageId=5')).toBe('Lan Nguyễn');
        expect(readListSearchQuery('')).toBe('');
    });

    it('ghi hoặc gỡ từ khoá mà giữ nguyên các tham số khác của URL', () => {
        expect(withListSearchQuery('/app/accounts/1/conversations/7?messageId=5', 'đơn hàng')).toBe(
            '/app/accounts/1/conversations/7?messageId=5&q=%C4%91%C6%A1n+h%C3%A0ng',
        );
        expect(withListSearchQuery('/app/accounts/1/dashboard?q=lan&messageId=5', '  ')).toBe(
            '/app/accounts/1/dashboard?messageId=5',
        );
        expect(withListSearchQuery('/app/accounts/1/dashboard', '')).toBe('/app/accounts/1/dashboard');
    });

    it('gộp id khớp theo trang, trang 1 thay tập cũ, không tìm thì không giới hạn', () => {
        const firstPage = nextSearchMatches(null, [{ id: 1 }, { id: 2 }], 'lan', false);
        const secondPage = nextSearchMatches(firstPage, [{ id: 3 }], 'lan', true);

        expect([...secondPage!]).toEqual([1, 2, 3]);
        expect([...nextSearchMatches(secondPage, [{ id: 9 }], 'lan', false)!]).toEqual([9]);
        expect(nextSearchMatches(secondPage, [{ id: 9 }], undefined, true)).toBeNull();
    });

    it('khi đang tìm chỉ giữ hội thoại máy chủ đã trả cho từ khoá', () => {
        const list = [{ id: 1 }, { id: 2 }, { id: 3 }];

        expect(keepSearchMatches(list, new Set([3, 1]))).toEqual([{ id: 1 }, { id: 3 }]);
        expect(keepSearchMatches(list, null)).toBe(list);
    });
});
