import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
    assertUrlAllowed,
    buildAllowedHosts,
    cleanupTempDownload,
    collectSourceIdsFromSendResult,
    downloadUrlToTemp,
    safeAttachmentFilename,
} from './media-fetch.mjs';

// ── allowlist ────────────────────────────────────────────────────────────────

test('buildAllowedHosts: host Laravel + CSV mở rộng, lowercase', () => {
    const hosts = buildAllowedHosts({
        laravelWebhookUrl: 'http://APP.local:8000/api/webhook',
        extraCsv: 'Storage.example.com , cdn.other.vn',
    });
    assert.ok(hosts.has('app.local'));
    assert.ok(hosts.has('storage.example.com'));
    assert.ok(hosts.has('cdn.other.vn'));
});

test('buildAllowedHosts: nhận cả host của LARAVEL_BASE_URL khi khác host webhook', () => {
    // Bug thật: APP_URL=http://localhost:8000 nên signed URL đính kèm mang host
    // localhost, còn webhook khai 127.0.0.1 → mọi lần gửi ảnh fail_host_not_allowed.
    const hosts = buildAllowedHosts({
        laravelWebhookUrl: 'http://127.0.0.1:8000/webhooks/zalo',
        laravelBaseUrl: 'http://LOCALHOST:8000',
    });
    assert.ok(hosts.has('127.0.0.1'));
    assert.ok(hosts.has('localhost'));
    assert.doesNotThrow(() => assertUrlAllowed('http://localhost:8000/storage/x.jpg', hosts));
});

test('buildAllowedHosts: bỏ qua LARAVEL_BASE_URL hỏng, không nới allowlist', () => {
    const hosts = buildAllowedHosts({ laravelWebhookUrl: 'http://app.local', laravelBaseUrl: 'khong-phai-url' });
    assert.deepEqual([...hosts], ['app.local']);
});

test('assertUrlAllowed: chặn host lạ + scheme lạ, fail-closed khi allowlist rỗng', () => {
    const hosts = new Set(['app.local']);
    assert.doesNotThrow(() => assertUrlAllowed('http://app.local/x', hosts));
    assert.throws(() => assertUrlAllowed('http://evil.com/x', hosts), /fetch_host_not_allowed/);
    assert.throws(() => assertUrlAllowed('ftp://app.local/x', hosts), /fetch_scheme_not_allowed/);
    assert.throws(() => assertUrlAllowed('not a url', hosts), /fetch_url_invalid/);
    assert.throws(() => assertUrlAllowed('http://app.local/x', new Set()), /fetch_host_not_allowed/);
});

// ── byte cap ─────────────────────────────────────────────────────────────────

function serveOnce(handler) {
    return new Promise((resolve) => {
        const server = http.createServer(handler);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            resolve({ server, url: `http://127.0.0.1:${port}/f` });
        });
    });
}

test('downloadUrlToTemp: Content-Length quá cap → download_too_large (không đọc body)', async () => {
    const { server, url } = await serveOnce((req, res) => {
        res.writeHead(200, { 'Content-Length': '99999999', 'Content-Type': 'application/pdf' });
        res.end(Buffer.alloc(10));
    });
    try {
        await assert.rejects(
            downloadUrlToTemp(url, { maxBytes: 1000, allowedHosts: new Set(['127.0.0.1']) }),
            /download_too_large/
        );
    } finally {
        server.close();
    }
});

test('downloadUrlToTemp: body vượt cap khi thiếu Content-Length → download_too_large (streaming cap)', async () => {
    const { server, url } = await serveOnce((req, res) => {
        // chunked — không Content-Length
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.write(Buffer.alloc(600));
        res.write(Buffer.alloc(600));
        res.end();
    });
    try {
        await assert.rejects(
            downloadUrlToTemp(url, { maxBytes: 1000, allowedHosts: new Set(['127.0.0.1']) }),
            /download_too_large/
        );
    } finally {
        server.close();
    }
});

test('downloadUrlToTemp: trong cap → ghi file tạm đúng ext theo content-type', async () => {
    const { server, url } = await serveOnce((req, res) => {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(Buffer.from('PNGDATA'));
    });
    try {
        const p = await downloadUrlToTemp(url, { maxBytes: 1000, allowedHosts: new Set(['127.0.0.1']) });
        assert.match(p, /\.png$/);
        assert.equal((await fs.readFile(p)).toString(), 'PNGDATA');
        await fs.unlink(p);
    } finally {
        server.close();
    }
});

test('downloadUrlToTemp: redirect sang host NGOÀI allowlist bị chặn (re-validate URL cuối — M1)', async () => {
    // target: localhost (resolve được, KHÔNG trong allowlist chỉ có 127.0.0.1)
    const { server: target, url: targetUrl } = await serveOnce((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('secret');
    });
    const targetPort = new URL(targetUrl).port;
    const { server: redirector, url } = await serveOnce((req, res) => {
        res.writeHead(302, { Location: `http://localhost:${targetPort}/steal` });
        res.end();
    });
    try {
        await assert.rejects(
            downloadUrlToTemp(url, { maxBytes: 1000, allowedHosts: new Set(['127.0.0.1']) }),
            /fetch_host_not_allowed/
        );
    } finally {
        redirector.close();
        target.close();
    }
});

test('downloadUrlToTemp: host ngoài allowlist bị chặn TRƯỚC khi fetch', async () => {
    await assert.rejects(
        downloadUrlToTemp('http://evil.example/f', { allowedHosts: new Set(['app.local']) }),
        /fetch_host_not_allowed/
    );
});

// ── collect source ids (file + caption = 2 msgId — Codex MED-7) ─────────────

test('collectSourceIdsFromSendResult: gom message + attachment, dedup, giữ thứ tự (primary = message)', () => {
    const ids = collectSourceIdsFromSendResult({
        message: { msgId: '111' },
        attachment: [{ msgId: '222' }, { data: { msgId: '333' } }, { msgId: '222' }],
    });
    assert.deepEqual(ids, ['111', '222', '333']);
});

test('collectSourceIdsFromSendResult: chỉ text → 1 id; rỗng → []', () => {
    assert.deepEqual(collectSourceIdsFromSendResult({ message: { msgId: '9' } }), ['9']);
    assert.deepEqual(collectSourceIdsFromSendResult(null), []);
    assert.deepEqual(collectSourceIdsFromSendResult({}), []);
});

test('collectSourceIdsFromSendResult: sendSticker trả msgId phẳng (không wrapper) → vẫn thu id (bug double sticker 05/07)', () => {
    assert.deepEqual(collectSourceIdsFromSendResult({ msgId: 777155 }), ['777155']);
    assert.deepEqual(collectSourceIdsFromSendResult({ msgID: '888' }), ['888']);
    // phẳng + wrapper cùng lúc: primary = phẳng, không dup
    assert.deepEqual(collectSourceIdsFromSendResult({ msgId: '1', message: { msgId: '1' } }), ['1']);
});

// ── Tên tệp gửi ra Zalo (lô 3: Laravel gửi filename + content_type) ──────────

test('safeAttachmentFilename: giữ TÊN THẬT (kể cả tiếng Việt), bỏ đường dẫn, thêm đuôi khi thiếu', () => {
    assert.equal(safeAttachmentFilename('Báo giá Q4.pdf', 'bin'), 'Báo giá Q4.pdf');
    assert.equal(safeAttachmentFilename('/tmp/../../etc/passwd', 'bin'), 'passwd.bin');
    assert.equal(safeAttachmentFilename('hop-dong', 'pdf'), 'hop-dong.pdf');
    assert.equal(safeAttachmentFilename('', 'pdf'), 'zbr-file.pdf');
    assert.equal(safeAttachmentFilename(null, ''), 'zbr-file.bin');
    assert.equal(safeAttachmentFilename('..', 'pdf'), 'zbr-file.pdf');
});

test('downloadUrlToTemp: file tạm mang tên thật — zca gửi đi bằng path.basename', async () => {
    // Bug: tên file tạm `zbr-<uuid>.bin` chính là tên NGƯỜI NHẬN thấy trên Zalo.
    const { server, url } = await serveOnce((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(Buffer.from('PDFDATA'));
    });
    let p = null;
    try {
        p = await downloadUrlToTemp(url, {
            maxBytes: 1000,
            allowedHosts: new Set(['127.0.0.1']),
            mediaKind: 'file',
            filenameHint: 'Báo giá Q4.pdf',
            contentTypeHint: 'application/pdf',
        });
        assert.equal(path.basename(p), 'Báo giá Q4.pdf');
        assert.equal((await fs.readFile(p)).toString(), 'PDFDATA');
    } finally {
        await cleanupTempDownload(p);
        server.close();
    }
});

test('downloadUrlToTemp: content_type của Laravel quyết định đuôi khi tên tệp không có đuôi', async () => {
    // Signed URL storage hay trả application/octet-stream → không suy ra được đuôi.
    const { server, url } = await serveOnce((req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end(Buffer.from('X'));
    });
    let p = null;
    try {
        p = await downloadUrlToTemp(url, {
            maxBytes: 1000,
            allowedHosts: new Set(['127.0.0.1']),
            mediaKind: 'file',
            filenameHint: 'hop-dong',
            contentTypeHint: 'application/pdf',
        });
        assert.equal(path.basename(p), 'hop-dong.pdf');
    } finally {
        await cleanupTempDownload(p);
        server.close();
    }
});

test('cleanupTempDownload: xoá cả thư mục tạm bọc ngoài, không để rác', async () => {
    const { server, url } = await serveOnce((req, res) => {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(Buffer.from('PNG'));
    });
    try {
        const p = await downloadUrlToTemp(url, {
            maxBytes: 1000,
            allowedHosts: new Set(['127.0.0.1']),
            filenameHint: 'anh.png',
        });
        const dir = path.dirname(p);
        await cleanupTempDownload(p);
        await assert.rejects(() => fs.stat(dir));
    } finally {
        server.close();
    }
});
