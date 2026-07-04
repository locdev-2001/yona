/**
 * lab.mjs — HARNESS chứng minh adapter generic end-to-end với session c16 THẬT.
 * Chạy: cd services/zalo-bridge && node .lab/lab.mjs
 * Bridge production phải TẮT (không tranh session). Chỉ ghi 1 tin cho CHÍNH MÌNH.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { Zalo, ThreadType } from 'zca-js';
import {
    buildAllowlist, invokeMethod, attachEventForwarder, ZCA_EVENTS,
} from './zca-adapter.mjs';
import { deriveInboundSourceId } from '../src/inbound-source-id.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const COOKIE = path.join(ROOT, '.sessions', 'c16.json');
const SECRET = 'lab-secret-value';
const PEER = '413176102153636621'; // peer test (founder duyệt) — evidence outbound+media+echo
const PORT = 3799;
const B = `http://127.0.0.1:${PORT}`;
const log = (...a) => console.log('[LAB]', ...a);
const events = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, body, secret = SECRET) {
    const r = await fetch(`${B}/zca/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-Bridge-Send-Secret': secret },
        body: JSON.stringify(body ?? {}),
    });
    return { status: r.status, json: await r.json().catch(() => ({})) };
}

async function main() {
    const creds = JSON.parse(await fs.readFile(COOKIE, 'utf8'));
    const imageMetadataGetter = async (fp) => {
        try {
            const m = await sharp(fp).metadata();
            const st = await fs.stat(fp);
            return (m.width && m.height) ? { width: m.width, height: m.height, size: m.size ?? st.size } : null;
        } catch { return null; }
    };
    const zalo = new Zalo({ selfListen: true, imageMetadataGetter });
    const api = await zalo.login({
        cookie: creds.cookie, imei: creds.imei, userAgent: creds.userAgent, language: 'vi',
    });
    const self = String(api.getOwnId());
    log('LOGIN OK · selfUid=', self);

    // === EVIDENCE 1: api shape → chiến lược allowlist ===
    const ownFns = Object.getOwnPropertyNames(api).filter((n) => { try { return typeof api[n] === 'function'; } catch { return false; } });
    const protoFns = Object.getOwnPropertyNames(Object.getPrototypeOf(api)).filter((n) => { try { return typeof api[n] === 'function'; } catch { return false; } });
    log('api shape: own-fn=', ownFns.length, 'proto-fn=', protoFns.length, '· .listener=', !!api.listener);

    const allow = buildAllowlist(api);
    log('ALLOWLIST size=', allow.size);
    log('  positive: sendMessage=', allow.has('sendMessage'), 'getUserInfo=', allow.has('getUserInfo'), 'getAllFriends=', allow.has('getAllFriends'), 'getOwnId=', allow.has('getOwnId'));
    log('  negatives-in-set: __proto__=', allow.has('__proto__'), 'constructor=', allow.has('constructor'), 'toString=', allow.has('toString'), 'hasOwnProperty=', allow.has('hasOwnProperty'), 'apply=', allow.has('apply'));
    log('  danger-real-methods present: custom=', allow.has('custom'), 'deleteMessage=', allow.has('deleteMessage'), 'disperseGroup=', allow.has('disperseGroup'));

    // === Generic forwarder: subscribe event CHƯA wired (né 5 bespoke + cipher_key) ===
    const subscribed = attachEventForwarder(api, (evt, payload) => {
        events.set(evt, (events.get(evt) || 0) + 1);
        const p0 = payload[0];
        // redteam-02 C3: old_messages = array nhiều tin → per-item normalize + source_id (KHÔNG passthrough raw)
        if (evt === 'old_messages') {
            const arr = Array.isArray(p0) ? p0 : [];
            const sids = arr.slice(0, 2).map((m) => deriveInboundSourceId('zalo_personal', String(api.getOwnId()), m?.data?.threadId, m?.data || {}));
            log('EVENT >> old_messages NORMALIZED', arr.length, 'tin · sample source_id=', JSON.stringify(sids));
            return;
        }
        let hint = '';
        try {
            if (evt === 'undo') hint = 'undo';
            else if (evt === 'seen_messages' || evt === 'delivered_messages') hint = 'n=' + (Array.isArray(p0) ? p0.length : '?');
        } catch { /* ignore */ }
        log('EVENT >>', evt, hint);
    });
    log('forwarder subscribed', subscribed.length, 'event (né 5 wired + cipher_key):', subscribed.join(','));

    // Bắt echo tin tự gửi (message = wired → ngoài forwarder) để chứng minh round-trip outbound
    api.listener.on('message', (m) => {
        if (m?.isSelf) { events.set('message', (events.get('message') || 0) + 1); log('ECHO >> message (self out) msgId=', m?.data?.msgId); }
    });

    const cipherReady = new Promise((res) => api.listener.on('cipher_key', () => res()));
    api.listener.start();
    log('listener started, chờ cipher_key…');

    // === Mount dispatcher generic + media multipart ===
    const app = express();
    app.use(express.json({ limit: '2mb' }));
    const upload = multer({ storage: multer.memoryStorage() });
    const auth = (req, res) => {
        if (!SECRET) { res.status(503).json({ ok: false, error: 'no_secret' }); return false; }
        if (req.header('X-Bridge-Send-Secret') !== SECRET) { res.status(403).json({ ok: false, error: 'forbidden' }); return false; }
        return true;
    };
    const STATUS = {
        METHOD_NOT_ALLOWED: 404, METHOD_DENIED: 403, OUTBOUND_USE_SEND_ENDPOINT: 409,
        DESTRUCTIVE_DENIED: 403, MEDIA_SPECIAL_ONLY: 415, FILE_REF_FORBIDDEN: 400,
        BAD_ARGS: 400, ARGS_TOO_LARGE: 413,
    };
    app.post('/zca/:method', async (req, res) => {
        if (!auth(req, res)) return;
        try {
            const out = await invokeMethod(api, allow, req.params.method, req.body?.args ?? []);
            res.json({ ok: true, result: out });
        } catch (e) {
            res.status(STATUS[e.code] || 500).json({ ok: false, code: e.code || 'ERR', error: String(e.message || e) });
        }
    });
    app.post('/zca-media/send', upload.single('file'), async (req, res) => {
        if (!auth(req, res)) return;
        let tmp;
        try {
            tmp = path.join(os.tmpdir(), `lab-${Date.now()}.png`);
            await fs.writeFile(tmp, req.file.buffer);
            const tt = Number(req.body.thread_type) === 1 ? ThreadType.Group : ThreadType.User;
            const r = await api.sendMessage({ msg: req.body.caption || '', attachments: [tmp] }, String(req.body.thread_id), tt);
            res.json({ ok: true, result: r });
        } catch (e) { res.status(500).json({ ok: false, error: String(e.message || e) }); }
        finally { if (tmp) await fs.unlink(tmp).catch(() => {}); }
    });

    const server = app.listen(PORT, async () => {
        log('dispatcher up :' + PORT);
        await Promise.race([cipherReady, sleep(12000)]);
        await drive(api, self);
        log('chờ 8s gom event async…');
        await sleep(8000);
        log('===== EVENT SUMMARY (16 event) =====');
        for (const evt of ZCA_EVENTS) log('  ', evt.padEnd(20), (events.get(evt) || 0) + 'x');
        log('DONE');
        try { api.listener.stop(); } catch { /* ignore */ }
        server.close();
        process.exit(0);
    });
}

async function drive(api, self) {
    log('===== TIER: AUTH =====');
    log('no-secret →', (await call('getOwnId', {}, '')).status, '(want 403)');
    log('wrong-secret →', (await call('getOwnId', {}, 'nope')).status, '(want 403)');
    const ok = await call('getOwnId', { args: [] });
    log('right-secret getOwnId →', ok.status, 'result=', ok.json.result);

    log('===== TIER: READ (dispatcher → real data) =====');
    const acct = await call('fetchAccountInfo', { args: [] });
    log('fetchAccountInfo →', acct.status, acct.json.ok ? 'ok (keys=' + Object.keys(acct.json.result?.profile || acct.json.result || {}).slice(0, 5).join(',') + ')' : acct.json.error);
    const fr = await call('getAllFriends', { args: [] });
    log('getAllFriends →', fr.status, fr.json.ok ? 'count=' + (Array.isArray(fr.json.result) ? fr.json.result.length : '?') : fr.json.error);

    log('===== TIER: ALLOWLIST / INJECTION (want reject) =====');
    for (const m of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'apply', 'valueOf', 'nonExistentXyz']) {
        const r = await call(m, { args: [] });
        log('  inject', m.padEnd(16), '→', r.status, r.json.code || '');
    }
    log('  deny custom() →', (await call('custom', { args: ['x'] })).status, '(want 403 METHOD_DENIED)');
    const badArgs = await call('getUserInfo', { args: { 0: self, length: 1 } });
    log('  non-array args →', badArgs.status, badArgs.json.code, '(want 400 BAD_ARGS)');

    log('===== TIER: MEDIA guard + path-traversal (want reject) =====');
    log('  sendVideo via JSON →', (await call('sendVideo', { args: [] })).status, '(want 415 MEDIA)');
    // FILE_REF độc lập: method READ non-outbound mang field file → chặn traversal trước khi tới zca
    const trav = await call('getGroupInfo', { args: [{ path: '/etc/passwd' }] });
    log('  getGroupInfo args{path:/etc/passwd} →', trav.status, trav.json.code, '(want 400 FILE_REF_FORBIDDEN — không execute → không leak)');

    log('===== TIER: OUTBOUND BOUNDARY (dispatcher CẤM send tin — F14 metering) =====');
    const sm = await call('sendMessage', { args: [{ msg: 'x' }, self, ThreadType.User] });
    log('  sendMessage via /zca →', sm.status, sm.json.code, '(want 409 OUTBOUND_USE_SEND_ENDPOINT — send đi /personal-messages/send riêng)');
    const fwd = await call('forwardMessage', { args: [] });
    log('  forwardMessage via /zca →', fwd.status, fwd.json.code, '(want 409)');

    log('===== TIER: DESTRUCTIVE guard (want 403 DESTRUCTIVE_DENIED — không có elevated secret) =====');
    for (const m of ['disperseGroup', 'deleteMessage', 'blockUser', 'removeUserFromGroup', 'undo']) {
        const r = await call(m, { args: [] });
        log('  destructive', m.padEnd(20), '→', r.status, r.json.code);
    }

    log('===== TIER: OUTBOUND REAL (đường /personal-messages/send — gửi peer test) =====');
    try {
        const r = await api.sendMessage({ msg: '[LAB test - bỏ qua] outbound smoke ' + Date.now() }, PEER, ThreadType.User);
        log('  sendMessage(peer) direct →', 'source_id=' + JSON.stringify(pickSid(r)));
    } catch (e) { log('  sendMessage(peer) ERR', String(e.message || e)); }

    log('===== TIER: MEDIA multipart (send 1x1 png to peer test) =====');
    try {
        const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: { r: 9, g: 9, b: 9 } } }).png().toBuffer();
        const form = new FormData();
        form.append('file', new Blob([png], { type: 'image/png' }), 'lab.png');
        form.append('thread_id', PEER);
        form.append('thread_type', '0');
        form.append('caption', '[LAB test - bỏ qua] media');
        const r = await fetch(`${B}/zca-media/send`, { method: 'POST', headers: { 'X-Bridge-Send-Secret': SECRET }, body: form });
        const j = await r.json();
        log('media multipart →', r.status, j.ok ? 'source_id=' + JSON.stringify(pickSid(j.result)) : j.error);
    } catch (e) { log('media multipart ERR', String(e.message || e)); }

    log('===== TIER: EVENT — old_messages backfill 1-1 (11-missed-event proof) =====');
    try { api.listener.requestOldMessages(ThreadType.User, null); log('requestOldMessages(User,null) sent'); }
    catch (e) { log('requestOldMessages ERR', String(e.message || e)); }
}

function pickSid(result) {
    if (!result) return null;
    return result.msgId ?? result.message?.msgId ?? result.attachment?.[0]?.msgId ?? result;
}

main().catch((e) => { console.error('[LAB] FATAL', e); process.exit(1); });
