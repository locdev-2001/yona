import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const FETCH_TIMEOUT_MS = 2500;

// Ảnh do tenant khai, tải từ bên trong máy chủ: chặn địa chỉ nội bộ để không ai dùng thẻ
// dò/đọc dịch vụ nội bộ (metadata cloud, Redis, cổng admin…). Local dev ảnh nằm ở
// 127.0.0.1 nên có cờ mở riêng.
const PRIVATE_V4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./];

export function isPrivateAddress(address) {
    if (isIP(address) === 4) return PRIVATE_V4.some(range => range.test(address));
    const v6 = address.toLowerCase();
    if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7));

    return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80');
}

// ponytail: kiểm DNS trước khi tải còn khe DNS rebinding (tên đổi IP giữa lookup và fetch);
// muốn kín hẳn thì tải qua agent ghim IP đã kiểm.
async function resolvesToPublicHost(url) {
    if (process.env.CARD_RENDER_ALLOW_PRIVATE_MEDIA === '1') return true;

    try {
        const { hostname } = new URL(url);
        const host = hostname.replace(/^\[|\]$/g, '');
        const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });

        return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
    } catch {
        return false;
    }
}
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Ảnh sản phẩm trong thẻ (`media_url`, do tenant/bot khai — đã qua `Action::url()`
 * phía PHP nên chỉ còn http/https). Tải kèm timeout ngắn; hỏng/quá giờ/quá nặng
 * thì trả `null` để template vẽ thẻ KHÔNG ảnh thay vì làm hỏng cả lượt render.
 *
 * @returns {Promise<string|null>} data URI hoặc null
 */
export async function fetchImageDataUri(url) {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url) || !(await resolvesToPublicHost(url))) {
        return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        // Không theo chuyển hướng: link công khai có thể chuyển sang địa chỉ nội bộ sau khi đã kiểm.
        const response = await fetch(url, { signal: controller.signal, redirect: 'manual' });

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
