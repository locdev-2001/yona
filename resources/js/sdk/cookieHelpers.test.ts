import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    computeHashForUserData,
    fnv1a128,
    getUserCookieName,
    getUserString,
    hasUserKeys,
    setCookieWithDomain,
} from './cookieHelpers';
import { getCookie } from './helpers/cookies';
import type { ChatwootInstance } from './types';

const stubChatwoot = (overrides: Partial<ChatwootInstance> = {}) => {
    window.$chatwoot = { websiteToken: '123456', ...overrides } as ChatwootInstance;
};

beforeEach(() => stubChatwoot());

afterEach(() => {
    document.cookie.split('; ').forEach(entry => {
        const name = entry.split('=')[0];
        if (name) document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    });
});

describe('getUserCookieName', () => {
    it('ghép tiền tố cw_user_ với websiteToken', () => {
        expect(getUserCookieName()).toBe('cw_user_123456');
    });
});

describe('getUserString', () => {
    it('trả chuỗi định danh theo đúng thứ tự khóa của bản gốc', () => {
        expect(
            getUserString({
                user: {
                    name: 'Pranav',
                    email: 'pranav@example.com',
                    avatar_url: 'https://images.chatwoot.com/placeholder',
                    identifier_hash: '12345',
                },
                identifier: '12345',
            }),
        ).toBe(
            JSON.stringify([
                ['avatar_url', 'https://images.chatwoot.com/placeholder'],
                ['email', 'pranav@example.com'],
                ['name', 'Pranav'],
                ['identifier_hash', '12345'],
                ['identifier', '12345'],
            ]),
        );
    });

    it('điền chuỗi rỗng cho khóa thiếu', () => {
        expect(
            getUserString({
                user: { email: 'pranav@example.com', avatar_url: 'https://images.chatwoot.com/placeholder' },
            }),
        ).toBe(
            JSON.stringify([
                ['avatar_url', 'https://images.chatwoot.com/placeholder'],
                ['email', 'pranav@example.com'],
                ['name', ''],
                ['identifier_hash', ''],
                ['identifier', ''],
            ]),
        );
    });
});

describe('fnv1a128', () => {
    // Vector chuẩn lấy nguyên từ refs/chatwoot/app/javascript/sdk/specs/cookieHelpers.spec.js
    it.each([
        ['', '6c62272e07bb014262b821756295c58d'],
        ['h', 'd228cb69681a8caf78912b704e4a80c7'],
        ['hello', 'e3e1efd54283d94f7081314b599d31b3'],
        ['hello world', '6c155799fdc8eec4b91523808e7726b7'],
    ])('băm %j thành %s', (value, expectedHash) => {
        expect(fnv1a128(value)).toBe(expectedHash);
    });

    it('băm ký tự UTF-8 nhiều byte', () => {
        expect(fnv1a128('🦄🌈')).toBe('0a25841ae4659905b36cb0d359fad39f');
    });
});

describe('computeHashForUserData', () => {
    it.each([
        [{ user: {} }, '1aad4cb46d5db425dcc232d086a8b6be'],
        [
            {
                identifier: '12345',
                user: {
                    name: 'Pranav',
                    email: 'pranav@example.com',
                    avatar_url: 'https://images.chatwoot.com/placeholder',
                    identifier_hash: '12345',
                },
            },
            '73b97d28ad386b211c8eed2143752b6e',
        ],
        [
            { identifier: 42, user: { name: 'Jöhn 🌈', email: '🦄@example.com' } },
            'ca2a97a04c3bcafc20d9cdeac1e5b3f4',
        ],
    ])('băm dữ liệu người dùng đúng như bản gốc', (userData, expectedHash) => {
        expect(computeHashForUserData(userData)).toBe(expectedHash);
    });

    it('không phụ thuộc thứ tự khai báo thuộc tính', () => {
        expect(computeHashForUserData({ identifier: '1', user: { name: 'A', email: 'a@b.c' } })).toBe(
            computeHashForUserData({ identifier: '1', user: { email: 'a@b.c', name: 'A' } }),
        );
    });

    it('bỏ qua thuộc tính ngoài danh sách định danh', () => {
        expect(computeHashForUserData({ identifier: '1', user: { name: 'A' } })).toBe(
            computeHashForUserData({ identifier: '1', user: { name: 'A', role: 'administrator' } }),
        );
    });

    it('coi identifier số và chuỗi là một', () => {
        expect(computeHashForUserData({ identifier: 123, user: { name: 'A' } })).toBe(
            computeHashForUserData({ identifier: '123', user: { name: 'A' } }),
        );
    });

    it('không phụ thuộc thứ tự khóa trong social_profiles', () => {
        expect(
            computeHashForUserData({
                identifier: '1',
                user: { name: 'A', social_profiles: { github: 'x', twitter: 'y' } },
            }),
        ).toBe(
            computeHashForUserData({
                identifier: '1',
                user: { name: 'A', social_profiles: { twitter: 'y', github: 'x' } },
            }),
        );
    });
});

describe('hasUserKeys', () => {
    it('chỉ chấp nhận avatar_url, email hoặc name', () => {
        expect(hasUserKeys({})).toBe(false);
        expect(hasUserKeys({ randomKey: 'randomValue' })).toBe(false);
        expect(hasUserKeys({ avatar_url: 'randomValue' })).toBe(true);
    });
});

describe('setCookieWithDomain', () => {
    it('ghi cookie đọc lại được', () => {
        setCookieWithDomain('cw_conversation', 'token');

        expect(getCookie('cw_conversation')).toBe('token');
    });

    it('chuyển object thành JSON trước khi ghi', () => {
        setCookieWithDomain('cw_payload', { value: 'x' });

        expect(getCookie('cw_payload')).toBe(JSON.stringify({ value: 'x' }));
    });
});
