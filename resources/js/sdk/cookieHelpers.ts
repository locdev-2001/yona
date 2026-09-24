// Port: refs/chatwoot/app/javascript/sdk/cookieHelpers.js
import { removeCookie, setCookie } from './helpers/cookies';
import type { CookieAttributes } from './helpers/cookies';
import type { SdkUserAttributes } from './types';

const REQUIRED_USER_KEYS = ['avatar_url', 'email', 'name'];
const ALLOWED_USER_ATTRIBUTES = [...REQUIRED_USER_KEYS, 'identifier_hash'];
const FNV1A_128_OFFSET_BASIS = 0x6c62272e07bb014262b821756295c58dn;
const FNV1A_128_PRIME = 0x1000000000000000000013bn;
const CONTACT_INFORMATION_ATTRIBUTES = [
    'phone_number',
    'company_name',
    'city',
    'country_code',
    'description',
    'social_profiles',
];

const normalizeUserAttribute = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value || '';

    const record = value as Record<string, unknown>;

    return Object.keys(record)
        .sort()
        .map(key => [key, record[key]]);
};

export const getUserCookieName = (): string => {
    const SET_USER_COOKIE_PREFIX = 'cw_user_';
    const { websiteToken: websiteIdentifier } = window.$chatwoot;

    return `${SET_USER_COOKIE_PREFIX}${websiteIdentifier}`;
};

export const getUserString = ({
    identifier = '',
    user,
}: {
    identifier?: string | number;
    user: SdkUserAttributes;
}): string => {
    const userAttributes = [
        ...ALLOWED_USER_ATTRIBUTES.map(key => [key, user[key] || '']),
        ...CONTACT_INFORMATION_ATTRIBUTES.filter(key => user[key] !== undefined).map(key => [
            key,
            normalizeUserAttribute(user[key]),
        ]),
        ['identifier', String(identifier)],
    ];

    return JSON.stringify(userAttributes);
};

export const fnv1a128 = (value: string): string => {
    const data = new TextEncoder().encode(value);
    let hash = FNV1A_128_OFFSET_BASIS;

    data.forEach(byte => {
        hash ^= BigInt(byte);
        hash = BigInt.asUintN(128, hash * FNV1A_128_PRIME);
    });

    return hash.toString(16).padStart(32, '0');
};

export const computeHashForUserData = (userData: { identifier?: string | number; user: SdkUserAttributes }): string =>
    fnv1a128(getUserString(userData));

export const hasUserKeys = (user: SdkUserAttributes): boolean =>
    REQUIRED_USER_KEYS.reduce((acc, key) => acc || !!user[key], false);

// Bộ thuộc tính dùng chung cho mọi cookie SDK ghi lẫn xoá: xoá chỉ có tác dụng khi khớp đúng
// thuộc tính lúc ghi. Trang HTTPS ghi SameSite=None; Secure; Partitioned để cookie vẫn ghi được
// khi mã nhúng nằm trong iframe khác site (khối HTML của site builder); trang HTTP không có
// Secure nên giữ Lax.
export const sdkCookieAttributes = (baseDomain?: string, protocol = window.location.protocol): CookieAttributes =>
    protocol === 'https:'
        ? { domain: baseDomain, sameSite: 'None', secure: true, partitioned: true }
        : { domain: baseDomain, sameSite: 'Lax' };

// Cookie ghi trước khi có Partitioned nằm ở kho không phân vùng. Không xoá bản đó thì trình
// duyệt giữ hai cookie cùng tên và SDK có thể đọc nhầm phiên cũ.
const removeUnpartitionedCopy = (name: string, attributes: CookieAttributes): void => {
    if (attributes.partitioned) removeCookie(name, { domain: attributes.domain });
};

export const setCookieWithDomain = (
    name: string,
    value: string | number | object,
    { expires = 365, baseDomain = undefined }: { expires?: number | Date; baseDomain?: string } = {},
): void => {
    const attributes = sdkCookieAttributes(baseDomain);
    const cookieValue = typeof value === 'object' ? JSON.stringify(value) : value;

    removeUnpartitionedCopy(name, attributes);
    setCookie(name, cookieValue, { ...attributes, expires });
};

export const removeCookieWithDomain = (name: string, baseDomain?: string): void => {
    const attributes = sdkCookieAttributes(baseDomain);

    removeUnpartitionedCopy(name, attributes);
    removeCookie(name, attributes);
};
