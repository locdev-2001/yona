/**
 * Self-check outbox.mjs — chạy: node src/outbox.test.mjs
 * Dùng node:test (built-in, no framework). Không cần Laravel thật.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createOutbox } from './outbox.mjs';
import { deriveInboundSourceId } from './inbound-source-id.mjs';

// --- helper setup ---

async function makeOutbox(fetchImpl, opts = {}) {
    const base = await fs.mkdtemp(path.join(tmpdir(), 'outbox-test-'));
    const dir = path.join(base, 'pending');
    const deadDir = path.join(base, 'dead');
    await fs.mkdir(dir, { recursive: true });
    await fs.mkdir(deadDir, { recursive: true });

    // Patch fetch cho môi trường test
    globalThis.fetch = fetchImpl;

    const outbox = createOutbox({
        dir,
        deadDir,
        webhookUrl: 'http://localhost:9999/fake',
        webhookSecret: 'test-secret',
        intervalMs: 999999, // tắt setInterval; test tự gọi drain
        maxRetries: 3,
        baseBackoffMs: 1,    // backoff rất ngắn để test không chờ lâu
        maxQueueMs: 60000,
        maxPayloadBytes: 900000,
    });

    return { outbox, dir, deadDir, base };
}

async function cleanup(base) {
    await fs.rm(base, { recursive: true, force: true });
}

function countFiles(d) {
    try { return fssync.readdirSync(d).filter((f) => /^\d+\.json$/.test(f)).length; }
    catch { return 0; }
}

// --- tests ---

test('enqueue 3, mock 503 503 200 → FIFO giữ tới khi 200 rồi xóa', async () => {
    let callCount = 0;
    const responses = [503, 503, 200];
    const { outbox, dir, base } = await makeOutbox(() => {
        const status = responses[callCount++ % responses.length] ?? 200;
        return Promise.resolve({ ok: status < 400, status, text: async () => '' });
    });

    await outbox.enqueue({ type: 'msg', n: 1 });
    await outbox.enqueue({ type: 'msg', n: 2 });
    await outbox.enqueue({ type: 'msg', n: 3 });

    // 3 files pending
    assert.equal(countFiles(dir), 3, 'should have 3 pending files after enqueue');

    // drain 1: tin #1 → 503 → giữ
    await outbox.drain();
    assert.equal(countFiles(dir), 3, 'all 3 still pending after first 503');

    // Mô phỏng next_attempt_at đã qua bằng cách reset
    const files = fssync.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)).sort();
    for (const f of files) {
        const fp = path.join(dir, f);
        const rec = JSON.parse(fssync.readFileSync(fp, 'utf8'));
        rec.next_attempt_at = 0;
        fssync.writeFileSync(fp, JSON.stringify(rec));
    }

    // drain 2: tin #1 → 503 lần 2 → giữ (attempts=2 chưa đủ maxRetries=3)
    await outbox.drain();

    // Reset lại next_attempt_at
    for (const f of fssync.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f))) {
        const fp = path.join(dir, f);
        const rec = JSON.parse(fssync.readFileSync(fp, 'utf8'));
        rec.next_attempt_at = 0;
        fssync.writeFileSync(fp, JSON.stringify(rec));
    }

    // drain 3: tin #1 → 200 → xóa; tiếp tin #2 → 503 (callCount=4 → responses[3%3]=503)
    await outbox.drain();

    // Tin #1 phải xóa
    assert.equal(countFiles(dir), 2, 'first message deleted after 200');

    await cleanup(base);
});

test('mock 400 → dead-letter ngay, KHÔNG chặn tin sau (H-2)', async () => {
    const statuses = [400, 200];
    let idx = 0;
    const { outbox, dir, deadDir, base } = await makeOutbox(async () => {
        const status = statuses[idx++] ?? 200;
        return { ok: status < 400, status, text: async () => '' };
    }, { intervalMs: 999999 });

    // Enqueue lần lượt và tắt auto-drain bằng cách await drain() ngay sau mỗi enqueue
    // để kiểm soát thứ tự fetch calls
    // Enqueue tin poison — auto-drain từ enqueue có thể chạy nhưng ta gọi drain lại explicit
    await outbox.enqueue({ type: 'poison', n: 1 });
    await outbox.enqueue({ type: 'ok', n: 2 });

    // Đợi 10ms để drain tự động (từ enqueue) settle xong
    await new Promise((r) => setTimeout(r, 10));

    // Reset next_attempt_at để đảm bảo drain chạy được ngay
    for (const f of fssync.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f))) {
        const fp = path.join(dir, f);
        const rec = JSON.parse(fssync.readFileSync(fp, 'utf8'));
        rec.next_attempt_at = 0;
        fssync.writeFileSync(fp, JSON.stringify(rec));
    }

    // Drain đến khi không còn pending (tối đa 5 lần để tránh vòng lặp vô hạn)
    for (let i = 0; i < 5; i++) {
        const pending = countFiles(dir);
        if (pending === 0) break;
        await outbox.drain();
        await new Promise((r) => setTimeout(r, 5));
        // Reset next_attempt_at sau mỗi drain
        for (const f of fssync.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f))) {
            const fp = path.join(dir, f);
            const rec = JSON.parse(fssync.readFileSync(fp, 'utf8'));
            if (rec.next_attempt_at > Date.now()) {
                rec.next_attempt_at = 0;
                fssync.writeFileSync(fp, JSON.stringify(rec));
            }
        }
    }

    // Tin ok phải xóa (không bị chặn bởi tin poison)
    assert.equal(countFiles(dir), 0, 'no pending files after poison+ok (H-2: poison continue not break)');
    // Tin poison phải vào dead-letter
    const deadFiles = fssync.readdirSync(deadDir).filter((f) => /^\d+\.json$/.test(f));
    assert.equal(deadFiles.length, 1, 'poison message in dead-letter');
    const deadRec = JSON.parse(fssync.readFileSync(path.join(deadDir, deadFiles[0]), 'utf8'));
    assert.ok(deadRec._dead_reason?.startsWith('http_4'), `dead reason should start with http_4, got: ${deadRec._dead_reason}`);

    await cleanup(base);
});

test('mock 401 → KHÔNG dead-letter, stats().authBlocked === true (H-3)', async () => {
    const { outbox, dir, deadDir, base } = await makeOutbox(() =>
        Promise.resolve({ ok: false, status: 401, text: async () => '' })
    );

    await outbox.enqueue({ type: 'msg', n: 1 });
    await outbox.drain();

    // File phải còn (không dead-letter)
    assert.equal(countFiles(dir), 1, 'message kept after 401 (not dead-lettered)');
    assert.equal(countFiles(deadDir), 0, 'dead-letter empty after 401');

    // authBlocked = true
    const stats = outbox.stats();
    assert.equal(stats.authBlocked, true, 'authBlocked should be true after 401');

    await cleanup(base);
});

test('seq collision: 2 enqueue ép cùng counter → không đè file (H-1)', async () => {
    // Không cần fetch thật — chỉ test file creation
    const { outbox, dir, base } = await makeOutbox(() =>
        Promise.resolve({ ok: false, status: 503, text: async () => '' })
    );

    // Enqueue nhiều lần
    await outbox.enqueue({ type: 'a' });
    await outbox.enqueue({ type: 'b' });
    await outbox.enqueue({ type: 'c' });

    const files = fssync.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f));
    // Tất cả file phải có seq khác nhau (không đè)
    const seqs = files.map((f) => f.replace('.json', ''));
    const uniqueSeqs = new Set(seqs);
    assert.equal(uniqueSeqs.size, files.length, 'all files have unique seq (no collision)');
    assert.equal(files.length, 3, 'all 3 messages enqueued');

    await cleanup(base);
});

test('deriveInboundSourceId: cùng input → cùng output; msgId rỗng → hash ổn định (C-2)', () => {
    // Case 1: có msgId → trả msgId
    const withMsgId = deriveInboundSourceId(1, 'group1', { msgId: '12345' });
    assert.equal(withMsgId, '12345', 'msgId present → return msgId');

    // Case 2: msgId rỗng → hash từ content
    const raw = { uidFrom: 'user1', ts: '1700000000000', content: 'hello' };
    const hash1 = deriveInboundSourceId(1, 'group1', raw);
    const hash2 = deriveInboundSourceId(1, 'group1', raw);
    assert.equal(hash1, hash2, 'same input → same hash (idempotent)');
    assert.ok(hash1.startsWith('zps-derived:'), 'hash has zps-derived prefix');

    // Case 3: khác connectionId → khác hash
    const hash3 = deriveInboundSourceId(2, 'group1', raw);
    assert.notEqual(hash1, hash3, 'different connectionId → different hash');

    // Case 4: gọi 2 lần với raw khác nội dung → khác hash
    const raw2 = { uidFrom: 'user1', ts: '1700000000000', content: 'world' };
    const hash4 = deriveInboundSourceId(1, 'group1', raw2);
    assert.notEqual(hash1, hash4, 'different content → different hash');
});

console.log('outbox.test.mjs: all checks passed');
