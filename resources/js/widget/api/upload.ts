import { getAuthToken, WidgetApiError } from './client';

// fetch không báo tiến trình tải lên, nên đường gửi tệp dùng XHR. Cùng bộ header
// phiên khách và cùng lỗi WidgetApiError với client chung.
// `signal` huỷ được yêu cầu đang tải (khách bấm X trên thẻ tệp đang gửi).
export const postFormWithProgress = <T = unknown>(
    url: string,
    form: FormData,
    onUploadProgress?: (loadedBytes: number, totalBytes: number) => void,
    signal?: AbortSignal,
): Promise<T> =>
    new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        if (signal?.aborted) {
            reject(new WidgetApiError(0, null));
            return;
        }
        xhr.open('POST', url);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        const authToken = getAuthToken();
        if (authToken) xhr.setRequestHeader('X-Auth-Token', authToken);

        if (onUploadProgress) {
            xhr.upload.onprogress = event => {
                if (event.lengthComputable) onUploadProgress(event.loaded, event.total);
            };
        }

        xhr.onload = () => {
            let body: unknown = null;
            try {
                body = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            } catch {
                body = null;
            }
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(new WidgetApiError(xhr.status, body));
                return;
            }
            resolve(body as T);
        };
        xhr.onerror = () => reject(new WidgetApiError(0, null));
        xhr.onabort = () => reject(new WidgetApiError(0, null));
        signal?.addEventListener('abort', () => xhr.abort(), { once: true });
        xhr.send(form);
    });
