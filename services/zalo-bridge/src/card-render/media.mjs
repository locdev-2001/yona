const FETCH_TIMEOUT_MS = 2500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Ảnh sản phẩm trong thẻ (`media_url`, do tenant/bot khai — đã qua `Action::url()`
 * phía PHP nên chỉ còn http/https). Tải kèm timeout ngắn; hỏng/quá giờ/quá nặng
 * thì trả `null` để template vẽ thẻ KHÔNG ảnh thay vì làm hỏng cả lượt render.
 *
 * @returns {Promise<string|null>} data URI hoặc null
 */
export async function fetchImageDataUri(url) {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
        return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
            return null;
        }

        const contentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();

        if (!contentType.startsWith('image/')) {
            return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());

        if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
            return null;
        }

        return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}
