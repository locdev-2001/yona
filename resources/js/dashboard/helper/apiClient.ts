import { RequestSigner, type KeyGrant } from 'shared/requestSigning/signer';
import { sendWithSessionRecovery } from './sessionRecovery';

// Client JSON tối giản cho web_api (session + CSRF cookie của Laravel).
export function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export class ApiError extends Error {
    constructor(
        public status: number,
        public body: { message?: string; error?: string; errors?: Record<string, string[]> } | null,
    ) {
        super(`Request failed: ${status}`);
    }
}

// Đọc message từ response lỗi của API.
export function parseApiErrorMessage(error: unknown): string | null {
    if (error instanceof ApiError && error.body) {
        if (error.body.errors) {
            const [first] = Object.values(error.body.errors).flat();
            if (first) return first;
        }
        // API trả lỗi dạng {error: "..."} (render_could_not_create_error).
        return error.body.error ?? error.body.message ?? null;
    }
    return null;
}

export type UploadProgressHandler = (loadedBytes: number, totalBytes: number) => void;

export interface RequestOptions {
    onUploadProgress?: UploadProgressHandler;
    signal?: AbortSignal;
}

const NULL_BODY_STATUSES = [101, 204, 205, 304];

const REQUEST_SIGNING_KEY_URL = '/api/v1/request_signing_key';

// Không đi qua sendWithSessionRecovery: trang chưa đăng nhập xin khoá nhận 401 là chuyện bình
// thường, không được tải lại trang. Không có khoá thì request đi thường, máy chủ trả 428 nếu cần.
async function requestSigningGrant(): Promise<KeyGrant | null> {
    const response = await fetch(REQUEST_SIGNING_KEY_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest', 'X-XSRF-TOKEN': xsrfToken() },
        credentials: 'same-origin',
    });
    return response.ok ? ((await response.json()) as KeyGrant) : null;
}

const requestSigner = new RequestSigner(requestSigningGrant);

// fetch chưa báo được tiến trình gửi lên: yêu cầu cần tiến trình đi qua XHR và
// trả về Response như fetch để phần xử lý phiên/lỗi phía sau dùng chung.
function sendWithUploadProgress(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: BodyInit | undefined,
    onUploadProgress: UploadProgressHandler,
    signal?: AbortSignal,
): Promise<Response> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        signal?.addEventListener('abort', () => xhr.abort(), { once: true });
        xhr.open(method, url);
        xhr.withCredentials = true;
        Object.entries(headers).forEach(([name, value]) => xhr.setRequestHeader(name, value));
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) onUploadProgress(event.loaded, event.total);
        };
        xhr.onload = () =>
            resolve(
                new Response(NULL_BODY_STATUSES.includes(xhr.status) ? null : xhr.responseText, {
                    status: xhr.status,
                    statusText: xhr.statusText,
                }),
            );
        xhr.onerror = () => reject(new TypeError('Network request failed'));
        xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
        xhr.send((body ?? null) as XMLHttpRequestBodyInit | null);
    });
}

async function request<T>(
    url: string,
    method: string,
    body?: BodyInit,
    contentType?: string,
    options: RequestOptions = {},
): Promise<T> {
    const headers: Record<string, string> = {
        ...(contentType ? { 'Content-Type': contentType } : {}),
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    };
    const { onUploadProgress, signal } = options;
    const response = await sendWithSessionRecovery(() =>
        requestSigner.send({ method, url, body }, (prepared) => {
            const preparedHeaders = { ...headers, ...prepared.headers, 'X-XSRF-TOKEN': xsrfToken() };
            const preparedBody = prepared.body ?? undefined;
            return onUploadProgress
                ? sendWithUploadProgress(url, method, preparedHeaders, preparedBody, onUploadProgress, signal)
                : fetch(url, { method, headers: preparedHeaders, credentials: 'same-origin', body: preparedBody, signal });
        }),
    );

    if (!response.ok) {
        throw new ApiError(response.status, await response.json().catch(() => null));
    }

    // `head :ok` của Rails (vd DELETE /labels/{id}) trả 200 body rỗng — json() sẽ ném.
    const rawBody = await response.text();

    return (rawBody ? JSON.parse(rawBody) : null) as T;
}

export function getJson<T = unknown>(url: string, options?: RequestOptions): Promise<T> {
    return request<T>(url, 'GET', undefined, undefined, options);
}

export function postJson<T = unknown>(url: string, body: Record<string, unknown>): Promise<T> {
    return request<T>(url, 'POST', JSON.stringify(body), 'application/json');
}

export function putJson<T = unknown>(url: string, body: Record<string, unknown>): Promise<T> {
    return request<T>(url, 'PUT', JSON.stringify(body), 'application/json');
}

export function patchJson<T = unknown>(url: string, body: Record<string, unknown>): Promise<T> {
    return request<T>(url, 'PATCH', JSON.stringify(body), 'application/json');
}

export function deleteJson<T = unknown>(url: string, body?: Record<string, unknown>): Promise<T> {
    return body
        ? request<T>(url, 'DELETE', JSON.stringify(body), 'application/json')
        : request<T>(url, 'DELETE');
}

export function postForm<T = unknown>(url: string, form: FormData, options?: RequestOptions): Promise<T> {
    return request<T>(url, 'POST', form, undefined, options);
}

// Multipart (upload file) — Laravel chỉ đọc _method từ POST nên spoof PUT.
export function putForm<T = unknown>(url: string, form: FormData): Promise<T> {
    form.set('_method', 'PUT');
    return request<T>(url, 'POST', form);
}

// Endpoint trả CSV (báo cáo tải về) — giữ nguyên văn bản, không parse JSON.
export async function getText(url: string): Promise<string> {
    const response = await sendWithSessionRecovery(() =>
        fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'text/csv, text/plain, */*',
                'X-Requested-With': 'XMLHttpRequest',
                'X-XSRF-TOKEN': xsrfToken(),
            },
            credentials: 'same-origin',
        }),
    );

    if (!response.ok) {
        throw new ApiError(response.status, null);
    }

    return response.text();
}
