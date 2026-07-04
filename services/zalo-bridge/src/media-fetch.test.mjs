import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import {
    assertUrlAllowed,
    buildAllowedHosts,
    collectSourceIdsFromSendResult,
    downloadUrlToTemp,
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
