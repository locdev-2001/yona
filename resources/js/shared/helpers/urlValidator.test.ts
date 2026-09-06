import { describe, expect, it } from 'vitest';

import { URL_REGEX, isUrl, isUrlInvalid } from './Validators';

// Bản gốc dùng validator `url` của @vuelidate/validators cho form webhook,
// agent bot và dashboard app. Regex dưới đây chép nguyên văn từ
// @vuelidate/validators 2.0.4 (dist/raw.cjs) để khoá đúng ngữ nghĩa đó.
const VUELIDATE_URL_REGEX =
    /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9¡-￿][a-z0-9¡-￿_-]{0,62})?[a-z0-9¡-￿]\.)+(?:[a-z¡-￿]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i;

const SAMPLES = [
    'https://example.com/hook',
    'http://sub.example.co.uk/a?b=1#c',
    '//example.com/x',
    'ftp://example.com',
    'https://8.8.8.8/hook',
    'http://ví-dụ.vn/a',
    'http://localhost:3000/hook',
    'http://127.0.0.1/hook',
    'http://192.168.0.1/hook',
    'example.com',
    'javascript:alert(1)',
    'https://',
    'chưa phải url',
];

describe('validator url', () => {
    it('khớp từng ký tự với regex của vuelidate', () => {
        expect(URL_REGEX.source).toBe(VUELIDATE_URL_REGEX.source);
        expect(URL_REGEX.flags).toBe(VUELIDATE_URL_REGEX.flags);
    });

    it.each(SAMPLES)('cho cùng kết quả với vuelidate: %s', sample => {
        expect(URL_REGEX.test(sample)).toBe(VUELIDATE_URL_REGEX.test(sample));
    });

    it('coi chuỗi rỗng là hợp lệ như helper regex của vuelidate (required lo phần rỗng)', () => {
        expect(isUrl('')).toBe(true);
        expect(isUrlInvalid('')).toBe(true);
    });

    it('áp minLength của form webhook', () => {
        expect(isUrlInvalid('//a.io', 7)).toBe(true);
        expect(isUrlInvalid('//ab.io', 7)).toBe(false);
        expect(isUrlInvalid('//a.io')).toBe(false);
    });

    it('từ chối localhost và IP nội bộ như bản gốc', () => {
        expect(isUrlInvalid('http://localhost:3000/hook')).toBe(true);
        expect(isUrlInvalid('http://127.0.0.1/hook')).toBe(true);
        expect(isUrlInvalid('https://hooks.example.com/x')).toBe(false);
    });
});
