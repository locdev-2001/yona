/**
 * Tier 1 Outbox — persistent FIFO file-based, no extra dependencies.
 *
 * Đảm bảo at-least-once delivery cho webhook Laravel.
 * Contract:
 *   2xx → done (xóa file)
 *   401/403 → auth (giữ, retry mỗi 30s, KHÔNG dead-letter — bao giờ secret sửa thì gửi)
 *   413 / 4xx khác → dead-letter (poison, không retry vĩnh viễn)
 *   5xx / 408 / 429 / network error → retry với backoff
 *
 * PM2 PHẢI chạy instances:1 exec_mode:fork — file-based không an toàn multi-process.
 * ponytail: single-process assumption; per-account locks nếu sau này cần cluster.
 */

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';

export function createOutbox({
    dir,
    deadDir,
    webhookUrl,
    webhookSecret,
    intervalMs = 5000,
    maxRetries = 8,
    baseBackoffMs = 2000,
    maxQueueMs = 3600000,    // H-2: trần wall-clock 1h → dead-letter dù chưa đủ attempts
    maxPayloadBytes = 900000, // H-4: dưới nginx 1MB mặc định
    // Kick drain ngay sau enqueue. Chỉ test tắt (cùng lý do đã tắt setInterval):
    // drain nền chạy xen kẽ làm thứ tự phản hồi giả không còn xác định.
    kickOnEnqueue = true,
}) {
    let _counter = 1;
    let _draining = false;
    let _authBlocked = false;
    let _interval = null;

    // Boot: quét max seq hiện có ở cả dir + deadDir để counter monotonic kể cả sau restart
    function initCounter() {
        const pending = safeReaddirSync(dir);
        const dead = safeReaddirSync(deadDir);
        const all = [...pending, ...dead];
        const max = all
            .map((f) => parseSeqFromName(path.basename(f)))
            .reduce((m, n) => Math.max(m, n), 0);
        _counter = max + 1;
    }

    function safeReaddirSync(d) {
        try {
            return fssync.readdirSync(d);
        } catch {
            return [];
        }
    }

    // H-1: counter thuần, không wall-clock — clock lùi/NTP nhảy không phá FIFO
    function nextSeq() {
        return String(_counter++).padStart(19, '0');
    }

    function parseSeqFromName(basename) {
        const m = String(basename).match(/^(\d+)\.json$/);
        return m ? Number(m[1]) : 0;
    }

    // Chỉ lấy *.json không có dot-prefix (bỏ .tmp và dead markers)
    function listPending() {
        const files = safeReaddirSync(dir)
            .filter((f) => /^\d+\.json$/.test(f))
            .sort(); // lexicographic = FIFO vì zero-padded
        return files.map((f) => path.join(dir, f));
    }

    function readJsonSync(filePath) {
        try {
            return JSON.parse(fssync.readFileSync(filePath, 'utf8'));
        } catch {
            return null; // file hỏng / bị xóa → bỏ qua
        }
    }

    // writeAtomic: tmp + rename → atomic trên cùng FS; chống file dở khi crash
    async function writeAtomic(seq, record) {
        const tmp = path.join(dir, `.${seq}.tmp`);
        const final = path.join(dir, `${seq}.json`);
        // H-1.2: chỉ check collision khi tạo mới (attempts===0)
        if (record.attempts === 0 && fssync.existsSync(final)) {
            throw new Error(`outbox seq collision: ${seq}`);
        }
        await fs.writeFile(tmp, JSON.stringify(record));
        await fs.rename(tmp, final); // atomic cùng FS
    }

    async function moveToDead(filePath, record, reason) {
        await fs.mkdir(deadDir, { recursive: true });
        const basename = path.basename(filePath);
        const destPath = path.join(deadDir, basename);
        const dead = { ...record, _dead_reason: reason, _dead_at: Date.now() };
        const content = JSON.stringify(dead);
        try {
            await fs.rename(filePath, destPath); // nhanh nếu cùng FS
            // ghi thêm meta vào file dead
            await fs.writeFile(destPath, content);
        } catch (e) {
            if (e.code === 'EXDEV') {
                // M-1: khác mount (symlink) → copy + unlink
                await fs.writeFile(destPath, content);
                await fs.unlink(filePath).catch(() => {});
            } else {
                throw e;
            }
        }
    }

    async function writeDead(seq, record, reason) {
        await fs.mkdir(deadDir, { recursive: true });
        const filePath = path.join(deadDir, `${seq}.json`);
        await fs.writeFile(filePath, JSON.stringify({ ...record, _dead_reason: reason, _dead_at: Date.now() }));
    }

    // H-4: loại bỏ base64 inline nếu có, giữ media_url
    function stripInlineMedia(body) {
        if (body && typeof body === 'object') {
            for (const key of ['base64', 'data', 'raw_data', 'file_data']) {
                if (typeof body[key] === 'string' && body[key].length > 10000) {
                    delete body[key];
                }
            }
        }
    }

    function classify(status) {
        if (status >= 200 && status < 300) return 'done';
        if (status === 401 || status === 403) return 'auth';   // H-3: nhánh riêng, không dead-letter
        if (status === 413) return 'dead';                     // H-4: payload quá lớn
        if (status === 408 || status === 429 || status >= 500) return 'retry';
        if (status >= 400) return 'dead';                      // 4xx poison → không spam retry
        return 'retry';
    }

    async function postOnce(record) {
        const headers = {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        };
        if (webhookSecret) {
            headers['X-Zalo-Personal-Bridge-Secret'] = webhookSecret;
        }
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
            let res;
            try {
                res = await fetch(webhookUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(record.body),
                    signal: controller.signal,
                });
            } finally {
                clearTimeout(timeout);
            }
            const outcome = classify(res.status);
            return { outcome, status: res.status };
        } catch (e) {
            // network error (ECONNRESET, ECONNREFUSED, AbortError/timeout) → retry
            return { outcome: 'retry', status: 0 };
        }
    }

    function backoff(attempts) {
        const base = Math.min(baseBackoffMs * 2 ** attempts, 300000); // cap 5 menit
        const jitter = Math.floor((Math.random() * 0.4 - 0.2) * base); // +-20%
        return Date.now() + base + jitter;
    }

    async function drain() {
        if (_draining) return;
        _draining = true;
        try {
            for (const filePath of listPending()) {
                const rec = readJsonSync(filePath);
                if (!rec) continue; // file hỏng → bỏ qua

                if (rec.next_attempt_at > Date.now()) break; // FIFO strict: head chưa tới hạn → dừng

                const { outcome, status } = await postOnce(rec);

                if (outcome === 'done') {
                    await fs.unlink(filePath).catch(() => {});
                    continue;
                }

                if (outcome === 'dead') {
                    // H-2: poison đơn lẻ → continue (không chặn hàng)
                    await moveToDead(filePath, rec, `http_${status}`).catch((e) =>
                        console.error('outbox: moveToDead fail', e?.message)
                    );
                    continue;
                }

                if (outcome === 'auth') {
                    // H-3: secret lệch → KHÔNG dead-letter, giữ tin, retry 30s
                    _authBlocked = true;
                    console.error(
                        'outbox: AUTH FAILED (401/403) — kiem tra LARAVEL_WEBHOOK_SECRET. Giu tin, khong bo.'
                    );
                    rec.next_attempt_at = Date.now() + 30000;
                    await writeAtomic(rec.seq, rec).catch(() => {});
                    break; // toàn cục → break
                }
                _authBlocked = false;

                // outcome === 'retry'
                rec.attempts++;
                const tooOld = Date.now() - rec.first_enqueued_at > maxQueueMs;
                if (rec.attempts >= maxRetries || tooOld) {
                    const reason = tooOld ? 'max_queue_age' : 'max_retries';
                    await moveToDead(filePath, rec, reason).catch((e) =>
                        console.error('outbox: moveToDead fail', e?.message)
                    );
                    console.error(`outbox: dead-letter seq=${rec.seq} reason=${reason}`);
                    continue; // H-2: tin này rơi dead → tin sau ĐƯỢC thử
                }
                rec.next_attempt_at = backoff(rec.attempts);
                await writeAtomic(rec.seq, rec).catch((e) =>
                    console.error('outbox: writeAtomic fail', e?.message)
                );
                break; // 5xx/network: head kẹt = toàn cục, break đúng
            }
        } finally {
            _draining = false;
        }
    }

    const outbox = {
        async enqueue(body) {
            await fs.mkdir(dir, { recursive: true });

            // H-4: chặn payload khổng lồ trước khi enqueue
            let json = JSON.stringify(body);
            if (json.length > maxPayloadBytes) {
                const bodyCopy = JSON.parse(json);
                stripInlineMedia(bodyCopy);
                json = JSON.stringify(bodyCopy);
                if (json.length > maxPayloadBytes) {
                    const seq = nextSeq();
                    await writeDead(seq, { body: bodyCopy }, 'payload_too_large');
                    console.error('outbox: payload_too_large dropped to dead-letter');
                    return;
                }
                body = JSON.parse(json);
            }

            let ok = false;
            for (let i = 0; i < 5 && !ok; i++) {
                const seq = nextSeq();
                try {
                    await writeAtomic(seq, {
                        seq,
                        attempts: 0,
                        next_attempt_at: 0,
                        first_enqueued_at: Date.now(),
                        body,
                    });
                    ok = true;
                } catch (e) {
                    if (!/collision/.test(e.message)) throw e;
                    // collision → nextSeq() tự tăng counter → retry
                }
            }
            if (!ok) throw new Error('outbox: failed to allocate seq after 5 attempts');

            // Kick drain ngay, không chờ interval
            if (kickOnEnqueue) {
                void this.drain();
            }
        },

        drain,

        start() {
            initCounter();
            void drain(); // drain ngay khi boot (xử lý outbox còn lại từ lần trước)
            _interval = setInterval(() => void drain(), intervalMs);
        },

        stop() {
            if (_interval) {
                clearInterval(_interval);
                _interval = null;
            }
        },

        // H-3 / M-4: stats cho healthcheck
        stats() {
            const pending = safeReaddirSync(dir).filter((f) => /^\d+\.json$/.test(f)).length;
            return { pending, authBlocked: _authBlocked };
        },
    };

    return outbox;
}
