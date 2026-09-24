// Thay `js-cookie` bằng bản tối giản tương đương để bundle SDK không kéo phụ thuộc ngoài.
// Quy tắc mã hoá tên/giá trị chép đúng js-cookie v3 (defaultConverter) để cookie do SDK ghi
// và cookie do bản gốc ghi đọc lẫn nhau được.

export type CookieAttributes = {
    expires?: number | Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: string;
    partitioned?: boolean;
};

const encodeCookieValue = (value: string): string =>
    encodeURIComponent(value).replace(/%(2[346BF]|3[AC-F]|40|5[BDE]|60|7[BCD])/g, decodeURIComponent);

const decodeCookieValue = (value: string): string => {
    const unquoted = value[0] === '"' ? value.slice(1, -1) : value;

    return unquoted.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
};

const encodeCookieName = (name: string): string =>
    encodeURIComponent(name)
        .replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent)
        .replace(/[()]/g, escape);

const serializeAttributes = (attributes: CookieAttributes): string => {
    const expires =
        typeof attributes.expires === 'number'
            ? new Date(Date.now() + attributes.expires * 864e5)
            : attributes.expires;

    const parts: Record<string, string | boolean | undefined> = {
        ...attributes,
        expires: expires ? expires.toUTCString() : undefined,
    };

    return Object.keys(parts).reduce((serialized, key) => {
        const value = parts[key];
        if (!value) return serialized;
        if (value === true) return `${serialized}; ${key}`;

        return `${serialized}; ${key}=${String(value).split(';')[0]}`;
    }, '');
};

export const setCookie = (name: string, value: string | number, attributes: CookieAttributes = {}): void => {
    document.cookie = `${encodeCookieName(name)}=${encodeCookieValue(String(value))}${serializeAttributes({
        path: '/',
        ...attributes,
    })}`;
};

export const getCookie = (name: string): string | undefined => {
    const jar = document.cookie ? document.cookie.split('; ') : [];

    for (const entry of jar) {
        const parts = entry.split('=');
        if (decodeCookieValue(parts[0]) !== name) continue;

        return decodeCookieValue(parts.slice(1).join('='));
    }

    return undefined;
};

export const removeCookie = (name: string, attributes: CookieAttributes = {}): void => {
    setCookie(name, '', { ...attributes, expires: -1 });
};
