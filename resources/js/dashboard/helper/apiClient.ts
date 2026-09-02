// Client JSON tối giản cho web_api (session + CSRF cookie của Laravel).
export function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export class ApiError extends Error {
    constructor(
        public status: number,
        public body: { message?: string; errors?: Record<string, string[]> } | null,
    ) {
        super(`Request failed: ${status}`);
    }
}

// Tương đương parseAPIErrorResponse của Chatwoot (đọc message từ response lỗi).
export function parseApiErrorMessage(error: unknown): string | null {
    if (error instanceof ApiError && error.body) {
        if (error.body.errors) {
            const [first] = Object.values(error.body.errors).flat();
            if (first) return first;
        }
        return error.body.message ?? null;
    }
    return null;
}

async function request<T>(url: string, method: string, body?: BodyInit, contentType?: string): Promise<T> {
    const response = await fetch(url, {
        method,
        headers: {
            ...(contentType ? { 'Content-Type': contentType } : {}),
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        credentials: 'same-origin',
        body,
    });

    if (!response.ok) {
        throw new ApiError(response.status, await response.json().catch(() => null));
    }

    return response.json() as Promise<T>;
}

export function getJson<T = unknown>(url: string): Promise<T> {
    return request<T>(url, 'GET');
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

export function deleteJson<T = unknown>(url: string): Promise<T> {
    return request<T>(url, 'DELETE');
}

// Multipart (upload file) — Laravel chỉ đọc _method từ POST nên spoof PUT.
export function putForm<T = unknown>(url: string, form: FormData): Promise<T> {
    form.set('_method', 'PUT');
    return request<T>(url, 'POST', form);
}
