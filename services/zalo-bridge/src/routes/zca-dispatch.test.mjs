/**
 * zca-dispatch.test.mjs — HTTP-level guard + LAB 2-slot B1 (P11).
 * Chạy: node --test (trong services/zalo-bridge). Offline — 2 slot fake trong
 * 1 process, KHÔNG cần cookie/session Zalo thật.
 *
 * LAB 2-slot (điều kiện tin cậy token B1, review BLOCKER-1):
 *   slot A (conn=101, ws=W1) · slot B (conn=202, ws=W2)
 *   token(conn=A, ws=W1) gọi conn=B → PHẢI 403 (mô phỏng call-site nạp
 *   connection tenant khác qua pgsql_privileged — token session không khớp binding).
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerZcaDispatchRoutes, workspaceToken } from './zca-dispatch.mjs';
import { buildAllowlist } from '../zca-adapter.mjs';

const SEND_SECRET = 'test-send-secret';
const ELEVATED_SECRET = 'test-elevated-secret';
const W1 = 'aaaaaaaa-1111-1111-1111-111111111111';
const W2 = 'bbbbbbbb-2222-2222-2222-222222222222';
const CONN_A = 101;
const CONN_B = 202;

function fakeApi(uid) {
    return {
        getOwnId: () => uid,
        getUserInfo: (id) => ({ profile: { id } }),
        sendMessage: () => ({ msgId: 'x' }),
        disperseGroup: (gid) => ({ dispersed: gid }),
        changeGroupOwner: (gid, uid2) => ({ owner: uid2, gid }),
        updateGroupSettings: () => ({ ok: 1 }),
        custom: () => ({}),
        sendVideo: () => ({}),
        getGroupInfo: (q) => ({ q }),
    };
}

function makeSlot(uid, workspaceId) {
    return { api: fakeApi(uid), loginPhase: 'ready', workspaceId, allowlist: null };
}

const slots = new Map([
    [String(CONN_A), makeSlot('uid_A', W1)],
    [String(CONN_B), makeSlot('uid_B', W2)],
    ['303', { api: fakeApi('uid_C'), loginPhase: 'ready', workspaceId: '', allowlist: null }], // chưa bind ws
]);

let server;
let base;

before(async () => {
    const app = express();
    app.use(express.json({ limit: '4mb' }));
    registerZcaDispatchRoutes(app, {
        resolveSlot: (id) => slots.get(String(id)),
        sendSecret: SEND_SECRET,
        elevatedSecret: ELEVATED_SECRET,
    });
    await new Promise((resolve) => {
        server = app.listen(0, '127.0.0.1', resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

async function call(method, { connId = CONN_A, ws = W1, args = [], secret = SEND_SECRET, elevated, token } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (secret !== null) headers['X-Bridge-Send-Secret'] = secret;
    if (elevated) headers['X-Bridge-Elevated-Secret'] = elevated;
    const body = {
        connection_id: connId,
        args,
        workspace_token: token ?? workspaceToken(connId, ws, SEND_SECRET),
    };
    const r = await fetch(`${base}/zca/${method}`, { method: 'POST', headers, body: JSON.stringify(body) });
    return { status: r.status, json: await r.json().catch(() => ({})) };
}

// ── auth (M3) ────────────────────────────────────────────────────────────────

test('auth: thiếu/sai secret → 403; đúng secret → 200 kèm data thật', async () => {
    assert.equal((await call('getOwnId', { secret: null })).status, 403);
    assert.equal((await call('getOwnId', { secret: 'wrong' })).status, 403);
    const ok = await call('getOwnId');
    assert.equal(ok.status, 200);
    assert.equal(ok.json.result, 'uid_A');
});

// ── LAB 2-slot B1 — token-từ-session ─────────────────────────────────────────

test('LAB 2-slot B1: token(conn=A, ws=W1) dùng cho conn=B(ws=W2) → 403', async () => {
    // token hợp lệ của A nhưng gắn vào request tới B
    const stolen = workspaceToken(CONN_A, W1, SEND_SECRET);
    const r = await call('getOwnId', { connId: CONN_B, token: stolen });
    assert.equal(r.status, 403);
    assert.equal(r.json.message, 'workspace_token_mismatch');
});

test('LAB 2-slot B1: call-site session W1 nạp được conn=B (bypass RLS giả định) → HMAC(B, W1) vẫn 403', async () => {
    // threat chính: Laravel call-site quên scope, nạp connection B (tenant W2)
    // nhưng session đang là W1 → token = HMAC(B, W1) ≠ HMAC(B, slot.workspaceId=W2)
    const r = await call('getOwnId', { connId: CONN_B, ws: W1 });
    assert.equal(r.status, 403);
    assert.equal(r.json.message, 'workspace_token_mismatch');
});

test('LAB 2-slot B1: token đúng workspace của từng slot → cả A lẫn B đều 200', async () => {
    assert.equal((await call('getOwnId', { connId: CONN_A, ws: W1 })).json.result, 'uid_A');
    assert.equal((await call('getOwnId', { connId: CONN_B, ws: W2 })).json.result, 'uid_B');
});

test('B1 fail-closed: slot chưa bind workspace → 403 workspace_binding_missing', async () => {
    const r = await call('getOwnId', { connId: 303, ws: W1 });
    assert.equal(r.status, 403);
    assert.equal(r.json.message, 'workspace_binding_missing');
});

test('B1: thiếu workspace_token → 403', async () => {
    const r = await call('getOwnId', { token: '' });
    assert.equal(r.status, 403);
});

// ── M2 resolve-only ──────────────────────────────────────────────────────────

test('M2: connection chưa login → 404 slot_not_ready, KHÔNG auto-create slot', async () => {
    const sizeBefore = slots.size;
    const r = await call('getOwnId', { connId: 999999, ws: W1 });
    assert.equal(r.status, 404);
    assert.equal(slots.size, sizeBefore);
});

// ── guard qua HTTP (status map) ──────────────────────────────────────────────

test('HTTP guard: send→409 · destructive→403 (gồm changeGroupOwner/updateGroupSettings) · deny→403 · media→415 · inject→404 · traversal→400 · quá cỡ→413', async () => {
    assert.equal((await call('sendMessage', { args: [{ msg: 'x' }, 'peer', 0] })).status, 409);
    for (const m of ['disperseGroup', 'changeGroupOwner', 'updateGroupSettings']) {
        const r = await call(m, { args: [] });
        assert.equal(r.status, 403);
        assert.equal(r.json.code, 'DESTRUCTIVE_DENIED');
    }
    assert.equal((await call('custom', { args: ['x'] })).status, 403);
    assert.equal((await call('sendVideo', { args: [] })).status, 415);
    assert.equal((await call('__proto__', { args: [] })).status, 404);
    assert.equal((await call('nonExistentXyz', { args: [] })).status, 404);
    assert.equal((await call('getGroupInfo', { args: [{ path: '/etc/passwd' }] })).status, 400);
    assert.equal((await call('getUserInfo', { args: ['y'.repeat(70 * 1024)] })).status, 413);
});

test('elevated: destructive + X-Bridge-Elevated-Secret đúng → thực thi; secret sai → vẫn 403', async () => {
    const ok = await call('changeGroupOwner', { args: ['g1', 'u9'], elevated: ELEVATED_SECRET });
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.json.result, { owner: 'u9', gid: 'g1' });
    assert.equal((await call('changeGroupOwner', { args: ['g1', 'u9'], elevated: 'wrong' })).status, 403);
});

test('KHÔNG có route /zca-media mới (MED-1 YAGNI) — 404', async () => {
    const r = await fetch(`${base}/zca-media/send`, { method: 'POST' });
    assert.equal(r.status, 404);
});
