import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * P04 — fetch media outbound an toàn (Codex MED): byte-cap (Content-Length pre-check
 * + streaming cap, KHÔNG arrayBuffer toàn bộ) + host/scheme allowlist. Laravel gửi
 * signed URL private disk (A3) — allowlist mặc định = host của LARAVEL_WEBHOOK_URL
 * VÀ host của LARAVEL_BASE_URL (hai biến có thể khác host: localhost vs 127.0.0.1).
 */

export const DEFAULT_MAX_FETCH_BYTES = 25 * 1024 * 1024; // headroom trên cap portal 20MB

export const MEDIA_KIND_DEFAULT_EXT = {
    image: 'jpg',
    gif: 'gif',
    video: 'mp4',
    audio: 'mp3',
    file: 'bin',
};

export function extFromFilename(name) {
    if (!name || typeof name !== 'string') {
        return null;
    }
    const m = name.match(/\.([a-zA-Z0-9]{1,8})$/);
    return m ? m[1].toLowerCase() : null;
}

/**
 * Tên tệp gửi ra Zalo: giữ TÊN THẬT do Laravel gửi kèm (`filename`), chỉ bỏ phần
 * đường dẫn và ký tự điều khiển. Không có tên thì mới dựng tên trung tính.
 *
 * @param {unknown} filenameHint tên tệp thật từ bản ghi đính kèm
 * @param {string} ext phần mở rộng đã suy ra (dùng khi tên thật không có đuôi)
 */
export function safeAttachmentFilename(filenameHint, ext) {
    const fallbackExt = String(ext || 'bin').replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase() || 'bin';
    const base = String(filenameHint ?? '').split(/[\\/]/).pop() ?? '';
    const cleaned = base
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .replace(/^\.+/, '')
        .trim();
    if (!cleaned) {
        return `zbr-file.${fallbackExt}`;
    }
    const own = extFromFilename(cleaned);
    const stem = (own ? cleaned.slice(0, -(own.length + 1)) : cleaned).slice(0, 100).trim() || 'zbr-file';
    return `${stem}.${own || fallbackExt}`;
}

export function mimeToExt(ct) {
    if (!ct || typeof ct !== 'string') {
        return null;
    }
    const base = ct.split(';')[0].trim().toLowerCase();
    const m = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'video/mp4': 'mp4',
        // Không có dòng này thì video iPhone tên không đuôi thành `.mp4` theo loại
        // media, bridge coi là mp4 thật và bỏ qua bước đổi vỏ.
        'video/quicktime': 'mov',
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'application/pdf': 'pdf',
    };
    return m[base] || null;
}

/**
 * allowedHosts: Set/array hostname lowercase. Rỗng/null = từ chối hết — FAIL-CLOSED,
 * không có đường bypass: dev chưa set LARAVEL_WEBHOOK_URL/LARAVEL_BASE_URL thì gửi media sẽ fail
 * (ghi rõ ở docs/features/messaging/composer-media.md).
 */
export function assertUrlAllowed(url, allowedHosts) {
    let parsed;
    try {
        parsed = new URL(String(url));
    } catch {
        throw new Error('fetch_url_invalid');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('fetch_scheme_not_allowed');
    }
    const hosts = allowedHosts instanceof Set ? allowedHosts : new Set(allowedHosts || []);
    if (!hosts.has(parsed.hostname.toLowerCase())) {
        throw new Error('fetch_host_not_allowed');
    }
    return parsed;
}

export function buildAllowedHosts({ laravelWebhookUrl, laravelBaseUrl, extraCsv }) {
    const hosts = new Set();
    // Đính kèm chiều ra là signed URL do Laravel dựng từ APP_URL, còn allowlist
    // trước đây chỉ lấy host của webhook — hai biến này khác host (localhost vs
    // 127.0.0.1) là mọi lần gửi ảnh đều fail `fetch_host_not_allowed`. Host của
    // LARAVEL_BASE_URL chính là host Laravel tự xưng nên phải nằm trong allowlist.
    for (const url of [laravelWebhookUrl, laravelBaseUrl]) {
        if (!url) {
            continue;
        }
        try {
            hosts.add(new URL(url).hostname.toLowerCase());
        } catch {
            /* ignore malformed */
        }
    }
    for (const h of String(extraCsv || '').split(',')) {
        const t = h.trim().toLowerCase();
        if (t) {
            hosts.add(t);
        }
    }
    return hosts;
}

/**
 * Tải URL về file tạm với cap bytes. Trả path file tạm; caller unlink sau khi gửi.
 * Throw: fetch_host_not_allowed | fetch_scheme_not_allowed | download_failed_<status>
 *      | download_too_large.
 */
export async function downloadUrlToTemp(
    url,
    { maxBytes = DEFAULT_MAX_FETCH_BYTES, allowedHosts, userAgent, mediaKind, filenameHint, contentTypeHint } = {}
) {
    assertUrlAllowed(url, allowedHosts);

    const res = await fetch(url, {
        headers: userAgent ? { 'User-Agent': userAgent } : {},
        redirect: 'follow',
    });
    if (!res.ok) {
        throw new Error(`download_failed_${res.status}`);
    }
    // Review M1: redirect có thể nhảy sang host lạ (open-redirect trên host
    // allowlisted = bypass) → re-validate URL CUỐI sau mọi redirect.
    assertUrlAllowed(res.url || url, allowedHosts);

    const contentLength = Number(res.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        await res.body?.cancel?.().catch(() => {});
        throw new Error('download_too_large');
    }

    // Streaming cap — Content-Length có thể vắng/nói dối, đếm bytes thật.
    const chunks = [];
    let total = 0;
    for await (const chunk of res.body) {
        total += chunk.length;
        if (total > maxBytes) {
            throw new Error('download_too_large');
        }
        chunks.push(chunk);
    }
    const buf = Buffer.concat(chunks);

    let ext = extFromFilename(filenameHint);
    if (!ext) {
        const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
        // content-type do Laravel khai (đúng theo bản ghi đính kèm) đứng TRƯỚC
        // header của storage — signed URL hay trả application/octet-stream.
        ext = mimeToExt(contentTypeHint) || mimeToExt(ct) || MEDIA_KIND_DEFAULT_EXT[mediaKind] || 'bin';
    }
    // zca lấy tên tệp gửi đi bằng `path.basename(filePath)` (zca-js utils.js:329,
    // sendMessage.js:297) — đặt tên file tạm là `zbr-<uuid>.bin` nghĩa là NGƯỜI
    // NHẬN thấy đúng cái tên đó. Nên tên thật nằm ở tên file, còn phần ngẫu nhiên
    // chống đụng độ lùi xuống tên THƯ MỤC tạm.
    const dir = path.join(tmpdir(), `zbr-${randomUUID()}`);
    await fs.mkdir(dir, { recursive: true });
    const p = path.join(dir, safeAttachmentFilename(filenameHint, ext));
    await fs.writeFile(p, buf);
    return p;
}

/** Dọn thứ `downloadUrlToTemp` tạo ra (file + thư mục tạm bọc ngoài). */
export async function cleanupTempDownload(tmpPath) {
    if (!tmpPath) {
        return;
    }
    const dir = path.dirname(String(tmpPath));
    if (path.basename(dir).startsWith('zbr-')) {
        await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
        return;
    }
    await fs.unlink(tmpPath).catch(() => {});
}

/**
 * P04 (Codex MED-7) — file + caption: zca tách 2 tin (text + attachment) → 2 msgId.
 * Thu TẤT CẢ msgId từ sendResult (message trước, attachment sau — giữ primary =
 * phần tử đầu, khớp hành vi pickSourceIdFromSendResult cũ).
 */
export function collectSourceIdsFromSendResult(sendResult) {
    if (!sendResult || typeof sendResult !== 'object') {
        return [];
    }
    const collect = [];
    // sendSticker (và API trả msgId phẳng, không wrapper message/attachment):
    // bỏ sót → source_id null → echo không dedup → double message (bug 05/07).
    if (sendResult.msgId != null || sendResult.msgID != null) {
        collect.push(sendResult);
    }
    if (sendResult.message) {
        collect.push(sendResult.message);
    }
    const att = sendResult.attachment;
    if (Array.isArray(att)) {
        for (const a of att) {
            if (a) {
                collect.push(a);
            }
        }
    } else if (att) {
        collect.push(att);
    }
    const ids = [];
    for (const raw of collect) {
        const id = raw?.msgId ?? raw?.msgID ?? raw?.data?.msgId ?? raw?.data?.msgID ?? raw?.cliMsgId;
        if (id !== undefined && id !== null && String(id) !== '') {
            const s = String(id);
            if (!ids.includes(s)) {
                ids.push(s);
            }
        }
    }
    return ids;
}
