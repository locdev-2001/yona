import { afterEach, describe, expect, it } from 'vitest';

import { getCookie, removeCookie, setCookie } from './cookies';

const clearCookies = () => {
    document.cookie.split('; ').forEach(entry => {
        const name = entry.split('=')[0];
        if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
};

afterEach(clearCookies);

describe('setCookie / getCookie', () => {
    it('ghi rồi đọc lại đúng giá trị', () => {
        setCookie('cw_conversation', 'jwt-token');

        expect(getCookie('cw_conversation')).toBe('jwt-token');
    });

    it('trả về undefined khi chưa có cookie', () => {
        expect(getCookie('cw_conversation')).toBeUndefined();
    });

    it('giữ nguyên ký tự JWT không bị mã hoá thừa', () => {
        const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzb3VyY2VfaWQiOiJhLWIifQ.sig-value_x';
        setCookie('cw_conversation', jwt);

        expect(document.cookie).toContain(`cw_conversation=${jwt}`);
        expect(getCookie('cw_conversation')).toBe(jwt);
    });

    it('mã hoá rồi giải mã giá trị có dấu chấm phẩy và khoảng trắng', () => {
        setCookie('cw_user_abc', 'a;b c');

        expect(getCookie('cw_user_abc')).toBe('a;b c');
    });

    it('bỏ dấu nháy bao quanh như js-cookie', () => {
        document.cookie = 'cw_quoted="value"; path=/';

        expect(getCookie('cw_quoted')).toBe('value');
    });

    it('đặt path mặc định là /', () => {
        setCookie('cw_conversation', 'x');

        expect(getCookie('cw_conversation')).toBe('x');
    });
});

describe('removeCookie', () => {
    it('xoá cookie đã ghi', () => {
        setCookie('cw_conversation', 'jwt-token');
        removeCookie('cw_conversation');

        expect(getCookie('cw_conversation')).toBeUndefined();
    });
});
