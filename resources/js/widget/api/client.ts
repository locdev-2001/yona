import { RequestSigner, type KeyGrant } from 'shared/requestSigning/signer';

// Client HTTP của widget — thay `widget/helpers/axios.js`.
// Khác apiClient của dashboard: không cookie, không CSRF; phiên khách đi bằng
// header `X-Auth-Token` và query `website_token` (hợp đồng c2-notes-be).

let authToken = '';
let websiteToken = '';
let locale = '';

// Token phiên khách còn được lưu ở localStorage của chính iframe widget (khoá theo website_token):
// trang chủ không ghi được cookie của SDK (mã nhúng nằm trong iframe khác site, trình duyệt chặn
// cookie) thì tải lại trang vẫn nhận lại đúng khách. `resetId` là mã lần xoá phiên đã xử lý.
interface StoredVisitorSession {
    authToken?: string;
    resetId?: string;
}

const visitorSessionKey = (): string => `widget_session:${websiteToken}`;

const readStoredSession = (): StoredVisitorSession => {
    if (!websiteToken) return {};
    try {
        return (JSON.parse(window.localStorage.getItem(visitorSessionKey()) ?? '{}') as StoredVisitorSession) ?? {};
    } catch {
        return {};
    }
};

const writeStoredSession = (session: StoredVisitorSession): void => {
    if (!websiteToken) return;
    try {
        window.localStorage.setItem(visitorSessionKey(), JSON.stringify(session));
    } catch {
        // Trình duyệt chặn bộ nhớ của iframe: phiên chỉ còn dựa vào cookie của SDK.
    }
};

// Xem trước trong dashboard: không ghi gì lên máy chủ, không lưu phiên (dashboard và widget
// cùng domain, lưu thì phiên xem trước lẫn vào phiên khách thật trên cùng trình duyệt).
let previewMode = false;

export const setPreviewMode = (enabled: boolean): void => {
    previewMode = enabled;
};

export const setAuthToken = (token: string): void => {
    // Khoá phiên ký request gắn với khách trong token: đổi khách là xin khoá mới.
    const visitorChanged = token !== authToken;
    authToken = token;
    if (visitorChanged) {
        widgetRequestSigner.invalidate();
        widgetRequestSigner.warmUp();
    }
    if (!previewMode) writeStoredSession({ ...readStoredSession(), authToken: token });
};

// Token lúc widget khởi động: token SDK gắn vào URL (cookie trang chủ) trước, rồi tới token widget
// tự lưu. Cờ phiên mới từ SDK làm widget quên token đã lưu, mỗi mã cờ chỉ dùng một lần: iframe nạp
// lại đúng URL đó (trang chuyển bằng Turbo, lịch sử trình duyệt) không được xoá phiên vừa tạo.
export const restoreAuthToken = ({ tokenFromUrl, resetId }: { tokenFromUrl: string; resetId: string }): void => {
    const storedSession = readStoredSession();
    authToken = '';
    widgetRequestSigner.invalidate();

    if (resetId && storedSession.resetId !== resetId) {
        writeStoredSession({ resetId });
        return;
    }

    const token = tokenFromUrl || storedSession.authToken;
    if (token) setAuthToken(token);
};

export const getAuthToken = (): string => authToken;

export const setWebsiteToken = (token: string): void => {
    websiteToken = token;
};

export const getWebsiteToken = (): string => websiteToken;

export const setLocale = (value: string): void => {
    locale = value;
};

/**
 * Hội thoại đang mở: display_id, `'new'` (sắp mở hội thoại mới — tin đầu tiên tạo
 * nó), hoặc null (chưa chọn → server dùng hội thoại mới nhất như widget đời cũ).
 * Nơi DUY NHẤT gắn `conversation_id` vào request.
 */
export type ActiveConversation = number | string | 'new' | null;
let activeConversation: ActiveConversation = null;

export const setActiveConversation = (conversation: ActiveConversation): void => {
    activeConversation = conversation === '' ? null : conversation;
};

export const getActiveConversation = (): ActiveConversation => activeConversation;

// buildSearchParamsWithLocale: mọi request mang website_token, thêm locale khi có.
export const buildSearch = (extra: Record<string, string | number | undefined> = {}): string => {
    const params = new URLSearchParams();
    if (websiteToken) params.set('website_token', websiteToken);
    if (locale) params.set('locale', locale);
    if (activeConversation !== null) params.set('conversation_id', String(activeConversation));
    Object.entries(extra).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    });
    const query = params.toString();
    return query ? `?${query}` : '';
};

const REQUEST_SIGNING_KEY_PATH = '/api/v1/widget/request_signing_key';

export const sessionHeaders = (): Record<string, string> => ({
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(authToken ? { 'X-Auth-Token': authToken } : {}),
});

async function requestSigningGrant(): Promise<KeyGrant | null> {
    if (!authToken) return null;
    const response = await fetch(`${REQUEST_SIGNING_KEY_PATH}${buildSearch()}`, {
        method: 'POST',
        headers: sessionHeaders(),
        credentials: 'omit',
    });
    return response.ok ? ((await response.json()) as KeyGrant) : null;
}

export const widgetRequestSigner = new RequestSigner(requestSigningGrant);

export class WidgetApiError extends Error {
    constructor(
        public status: number,
        public body: unknown,
    ) {
        super(`Widget request failed: ${status}`);
    }
}

// /config chỉ đọc (dù là POST): xem trước vẫn cần nó để có màu, tên, Help Center của hộp thư.
const PREVIEW_READ_ONLY_POSTS = ['/api/v1/widget/config'];

async function request<T>(url: string, method: string, body?: BodyInit, contentType?: string): Promise<T> {
    if (previewMode && method !== 'GET' && !PREVIEW_READ_ONLY_POSTS.some(path => url.startsWith(path))) {
        throw new WidgetApiError(423, { code: 'preview_read_only' });
    }

    const response = await widgetRequestSigner.send({ method, url, body }, (prepared) =>
        fetch(url, {
            method,
            headers: {
                ...(contentType ? { 'Content-Type': contentType } : {}),
                ...sessionHeaders(),
                ...prepared.headers,
            },
            credentials: 'omit',
            body: prepared.body,
        }),
    );

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
