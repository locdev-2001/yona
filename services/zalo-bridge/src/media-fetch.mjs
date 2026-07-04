import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * P04 — fetch media outbound an toàn (Codex MED): byte-cap (Content-Length pre-check
 * + streaming cap, KHÔNG arrayBuffer toàn bộ) + host/scheme allowlist. Laravel gửi
 * signed URL private disk (A3) — allowlist mặc định = host của LARAVEL_WEBHOOK_URL.
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
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'application/pdf': 'pdf',
    };
    return m[base] || null;
}

/**
 * allowedHosts: Set/array hostname lowercase. Rỗng/null = từ chối hết (fail-closed
 * khi thiếu config) TRỪ khi allowAll=true (dev không set LARAVEL_WEBHOOK_URL).
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

export function buildAllowedHosts({ laravelWebhookUrl, extraCsv }) {
    const hosts = new Set();
    if (laravelWebhookUrl) {
        try {
            hosts.add(new URL(laravelWebhookUrl).hostname.toLowerCase());
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
export async function downloadUrlToTemp(url, { maxBytes = DEFAULT_MAX_FETCH_BYTES, allowedHosts, userAgent, mediaKind, filenameHint } = {}) {
    assertUrlAllowed(url, allowedHosts);

    const res = await fetch(url, {
        headers: userAgent ? { 'User-Agent': userAgent } : {},
        redirect: 'follow',
    });
    if (!res.ok) {
        throw new Error(`download_failed_${res.status}`);
    }

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
        ext = mimeToExt(ct) || MEDIA_KIND_DEFAULT_EXT[mediaKind] || 'bin';
    }
    const safe = String(ext).replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'bin';
    const p = path.join(tmpdir(), `zbr-${randomUUID()}.${safe}`);
    await fs.writeFile(p, buf);
    return p;
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
