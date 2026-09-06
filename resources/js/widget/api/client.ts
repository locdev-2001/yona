// Client HTTP của widget — thay `widget/helpers/axios.js`.
// Khác apiClient của dashboard: không cookie, không CSRF; phiên khách đi bằng
// header `X-Auth-Token` và query `website_token` (hợp đồng c2-notes-be).

let authToken = '';
let websiteToken = '';
let locale = '';

export const setAuthToken = (token: string): void => {
    authToken = token;
};

export const getAuthToken = (): string => authToken;

export const setWebsiteToken = (token: string): void => {
    websiteToken = token;
};

export const setLocale = (value: string): void => {
    locale = value;
};

// buildSearchParamsWithLocale: mọi request mang website_token, thêm locale khi có.
export const buildSearch = (extra: Record<string, string | number | undefined> = {}): string => {
    const params = new URLSearchParams();
    if (websiteToken) params.set('website_token', websiteToken);
    if (locale) params.set('locale', locale);
    Object.entries(extra).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    const query = params.toString();
    return query ? `?${query}` : '';
};

export class WidgetApiError extends Error {
    constructor(
        public status: number,
        public body: unknown,
    ) {
        super(`Widget request failed: ${status}`);
    }
}

async function request<T>(url: string, method: string, body?: BodyInit, contentType?: string): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: {
            ...(contentType ? { 'Content-Type': contentType } : {}),
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(authToken ? { 'X-Auth-Token': authToken } : {}),
        },
        credentials: 'omit',
        body,
    });

    if (!response.ok) {
        throw new WidgetApiError(response.status, await response.json().catch(() => null));
    }

    const rawBody = await response.text();
    return (rawBody ? JSON.parse(rawBody) : null) as T;
}

export const apiGet = <T = unknown>(url: string): Promise<T> => request<T>(url, 'GET');

export const apiPost = <T = unknown>(url: string, body: Record<string, unknown> = {}): Promise<T> =>
    request<T>(url, 'POST', JSON.stringify(body), 'application/json');

export const apiPatch = <T = unknown>(url: string, body: Record<string, unknown> = {}): Promise<T> =>
    request<T>(url, 'PATCH', JSON.stringify(body), 'application/json');

export const apiDelete = <T = unknown>(url: string): Promise<T> => request<T>(url, 'DELETE');

export const apiPostForm = <T = unknown>(url: string, form: FormData): Promise<T> =>
    request<T>(url, 'POST', form);
