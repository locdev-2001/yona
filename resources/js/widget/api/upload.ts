import type { PreparedRequest } from 'shared/requestSigning/signer';
import { sessionHeaders, WidgetApiError, widgetRequestSigner } from './client';

const NULL_BODY_STATUSES = [101, 204, 205, 304];

// fetch không báo tiến trình tải lên, nên đường gửi tệp dùng XHR. Cùng bộ header
// phiên khách, cùng lớp ký request và cùng lỗi WidgetApiError với client chung.
// `signal` huỷ được yêu cầu đang tải (khách bấm X trên thẻ tệp đang gửi).
const sendWithProgress = (
    url: string,
    prepared: PreparedRequest,
    onUploadProgress?: (loadedBytes: number, totalBytes: number) => void,
    signal?: AbortSignal,
): Promise<Response> =>
    new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (signal?.aborted) {
            reject(new WidgetApiError(0, null));
            return;
        }
        xhr.open('POST', url);
        Object.entries({ ...sessionHeaders(), ...prepared.headers }).forEach(([name, value]) =>
            xhr.setRequestHeader(name, value),
        );

        if (onUploadProgress) {
            xhr.upload.onprogress = event => {
                if (event.lengthComputable) onUploadProgress(event.loaded, event.total);
            };
        }

        xhr.onload = () =>
            resolve(new Response(NULL_BODY_STATUSES.includes(xhr.status) ? null : xhr.responseText, { status: xhr.status }));
        xhr.onerror = () => reject(new WidgetApiError(0, null));
        xhr.onabort = () => reject(new WidgetApiError(0, null));
        signal?.addEventListener('abort', () => xhr.abort(), { once: true });
        xhr.send((prepared.body ?? null) as XMLHttpRequestBodyInit | null);
    });

export const postFormWithProgress = async <T = unknown>(
    url: string,
    form: FormData,
    onUploadProgress?: (loadedBytes: number, totalBytes: number) => void,
    signal?: AbortSignal,
): Promise<T> => {
    const response = await widgetRequestSigner.send({ method: 'POST', url, body: form }, prepared =>
        sendWithProgress(url, prepared, onUploadProgress, signal),
    );
    const rawBody = await response.text();
    let body: unknown = null;
    try {
        body = rawBody ? JSON.parse(rawBody) : null;
    } catch {
        body = null;
    }
    if (!response.ok) throw new WidgetApiError(response.status, body);
    return body as T;
};
