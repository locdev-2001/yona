import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    computeHashForUserData,
    fnv1a128,
    getUserCookieName,
    getUserString,
    hasUserKeys,
    removeCookieWithDomain,
    sdkCookieAttributes,
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

// Ghi lại từng chuỗi gán vào document.cookie (vẫn chuyển tiếp cho kho cookie thật của jsdom).
const recordCookieWrites = (targetDocument: Document): string[] => {
    const writes: string[] = [];
    const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(targetDocument), 'cookie')!;
    Object.defineProperty(targetDocument, 'cookie', {
        configurable: true,
        get: () => descriptor.get!.call(targetDocument),
        set: (value: string) => {
            writes.push(value);
            descriptor.set!.call(targetDocument, value);
        },
    });

    return writes;
};

const attributesOf = (cookieString: string): string[] =>
    cookieString
        .split('; ')
        .slice(1)
        .filter(part => !part.startsWith('expires='))
        .sort();

const isExpired = (cookieString: string): boolean => {
    const expires = cookieString.split('; ').find(part => part.startsWith('expires='));

    return Boolean(expires) && new Date(expires!.slice('expires='.length)).getTime() < Date.now();
};

describe('sdkCookieAttributes', () => {
    it('trang HTTPS: SameSite=None, Secure, Partitioned để ghi được cả trong iframe khác site', () => {
        expect(sdkCookieAttributes('.shop.vn', 'https:')).toEqual({
            domain: '.shop.vn',
            sameSite: 'None',
            secure: true,
            partitioned: true,
        });
    });

    it('trang HTTP: giữ Lax, không Secure (cookie Secure không ghi được trên HTTP)', () => {
        expect(sdkCookieAttributes('.shop.vn', 'http:')).toEqual({ domain: '.shop.vn', sameSite: 'Lax' });
    });
});

describe('ghi và xoá cookie trên trang HTTP', () => {
    it('xoá cookie bằng đúng bộ thuộc tính lúc ghi, kể cả domain', () => {
        const writes = recordCookieWrites(document);

        setCookieWithDomain('cw_conversation', 'token', { baseDomain: 'localhost' });
        removeCookieWithDomain('cw_conversation', 'localhost');
        delete (document as { cookie?: string }).cookie;

        const [written, removed] = writes;
        expect(attributesOf(written)).toEqual(['domain=localhost', 'path=/', 'sameSite=Lax']);
        expect(attributesOf(removed)).toEqual(attributesOf(written));
        expect(isExpired(removed)).toBe(true);
        expect(getCookie('cw_conversation')).toBeUndefined();
    });
});

describe('ghi và xoá cookie trên trang HTTPS', () => {
    // Môi trường jsdom của vitest để lộ bản JSDOM ở globalThis.jsdom: đổi URL sang HTTPS để
    // window.location.protocol và kho cookie cùng chạy như trên trang thật.
    const jsdomInstance = (globalThis as unknown as { jsdom: { reconfigure(options: { url: string }): void } })
        .jsdom;
    let writes: string[];

    beforeEach(() => {
        jsdomInstance.reconfigure({ url: 'https://shop.example/' });
        writes = recordCookieWrites(document);
    });

    afterEach(() => {
        delete (document as { cookie?: string }).cookie;
        jsdomInstance.reconfigure({ url: 'http://localhost/' });
    });

    it('ghi SameSite=None; Secure; Partitioned và đọc lại được', () => {
        setCookieWithDomain('cw_conversation', 'token');

        const written = writes[writes.length - 1];
        expect(attributesOf(written)).toEqual(['partitioned', 'path=/', 'sameSite=None', 'secure']);
        expect(getCookie('cw_conversation')).toBe('token');
    });

    it('xoá bằng đúng bộ thuộc tính lúc ghi', () => {
        setCookieWithDomain('cw_conversation', 'token');
        const written = writes[writes.length - 1];
        writes.length = 0;

        removeCookieWithDomain('cw_conversation');

        const removed = writes.find(write => write.includes('partitioned'))!;
        expect(attributesOf(removed)).toEqual(attributesOf(written));
        expect(isExpired(removed)).toBe(true);
        expect(getCookie('cw_conversation')).toBeUndefined();
    });

    it('xoá bản cookie cũ không Partitioned trước khi ghi, để không còn hai cookie cùng tên', () => {
        setCookieWithDomain('cw_conversation', 'token', { baseDomain: 'shop.example' });

        const [legacyRemoval, written] = writes;
        expect(attributesOf(legacyRemoval)).toEqual(['domain=shop.example', 'path=/']);
        expect(isExpired(legacyRemoval)).toBe(true);
        expect(attributesOf(written)).toContain('partitioned');
    });
});
