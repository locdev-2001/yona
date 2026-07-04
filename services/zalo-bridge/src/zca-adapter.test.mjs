/**
 * zca-adapter.test.mjs — M1 snapshot gate + guard reject (P11).
 * Chạy: node --test (trong services/zalo-bridge).
 *
 * M1: bump zca-js → method mới reflect ngoài snapshot chưa phân tier → FAIL —
 * chống denylist fail-open khi surface drift (red-team A-V6b).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    buildAllowlist, invokeMethod, ZCA_EVENTS, WIRED_EVENTS, NO_FORWARD_EVENTS,
    MEDIA_METHODS, BINARY_METHODS, ADAPTER_DENY, OUTBOUND_SEND_METHODS, DESTRUCTIVE_METHODS,
} from './zca-adapter.mjs';

const SNAPSHOT_PATH = new URL('./zca-methods.snapshot.json', import.meta.url);
const DTS_PATH = new URL('../node_modules/zca-js/dist/apis.d.ts', import.meta.url);

const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
const snapshotMethods = new Set(Object.keys(snapshot));

/** Bề mặt method THẬT của zca-js đang cài — LAB xác nhận .d.ts == runtime (146==146). */
function dtsMethods() {
    const dts = fs.readFileSync(DTS_PATH, 'utf8');
    const out = new Set();
    for (const m of dts.matchAll(/\{ ([a-zA-Z]+)Factory \}/g)) {
        out.add(m[1]);
    }
    return out;
}

/** Fake api: own-property function cho từng method (mirror factory pattern zca 2.1.2). */
function fakeApiFromSnapshot(extraMethods = []) {
    const api = {};
    for (const name of [...snapshotMethods, ...extraMethods]) {
        api[name] = (...args) => ({ called: name, args });
    }
    return api;
}

// ── M1: snapshot == bề mặt zca-js đang cài (2 chiều) ─────────────────────────

test('M1: mọi method zca-js đang cài đều CÓ trong snapshot (method mới chưa phân tier → fail)', () => {
    const real = dtsMethods();
    const unclassified = [...real].filter((m) => !snapshotMethods.has(m));
    assert.deepEqual(
        unclassified, [],
        `zca-js có method MỚI chưa phân tier: ${unclassified.join(', ')} — cập nhật snapshot + phân loại trước khi build`
    );
});

test('M1: snapshot không chứa phantom (entry không còn là method thật)', () => {
    const real = dtsMethods();
    const phantoms = [...snapshotMethods].filter((m) => !real.has(m));
    assert.deepEqual(phantoms, [], `snapshot có phantom: ${phantoms.join(', ')}`);
});

test('M1: snapshot đủ 146 method, tier hợp lệ, count khớp capability map', () => {
    assert.equal(snapshotMethods.size, 146);
    const validTiers = new Set(['DISPATCH_OK', 'DESTRUCTIVE', 'OUTBOUND_SEND', 'MEDIA', 'BINARY', 'DENY']);
    for (const [m, tier] of Object.entries(snapshot)) {
        assert.ok(validTiers.has(tier), `tier lạ ${tier} cho ${m}`);
    }
    const byTier = (t) => Object.values(snapshot).filter((v) => v === t).length;
    assert.equal(byTier('DESTRUCTIVE'), 39);
    assert.equal(byTier('OUTBOUND_SEND'), 6);
    assert.equal(byTier('MEDIA'), 6);
    assert.equal(byTier('BINARY'), 1);
    assert.equal(byTier('DENY'), 3);
});

test('M1: adapter sets khớp snapshot tier từng-method (không lệch 2 nguồn sự thật)', () => {
    const setsByTier = {
        DESTRUCTIVE: DESTRUCTIVE_METHODS,
        OUTBOUND_SEND: OUTBOUND_SEND_METHODS,
        MEDIA: MEDIA_METHODS,
        BINARY: BINARY_METHODS,
        DENY: ADAPTER_DENY,
    };
    for (const [tier, set] of Object.entries(setsByTier)) {
        const fromSnapshot = new Set(Object.keys(snapshot).filter((m) => snapshot[m] === tier));
        assert.deepEqual([...set].sort(), [...fromSnapshot].sort(), `set ${tier} lệch snapshot`);
    }
});

// ── buildAllowlist: reflect own-property, loại kế thừa/injection ─────────────

test('buildAllowlist: đếm đủ 146 own-fn, loại __proto__/constructor/toString', () => {
    const api = fakeApiFromSnapshot();
    const allow = buildAllowlist(api);
    assert.equal(allow.size, 146);
    for (const bad of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'apply', 'valueOf']) {
        assert.equal(allow.has(bad), false, `${bad} không được vào allowlist`);
    }
    assert.ok(allow.has('getOwnId') && allow.has('sendMessage') && allow.has('disperseGroup'));
});

test('M1 detector: method reflect NGOÀI snapshot bị phát hiện (mô phỏng bump zca)', () => {
    const api = fakeApiFromSnapshot(['brandNewDangerousMethod']);
    const allow = buildAllowlist(api);
    const unclassified = [...allow].filter((m) => !snapshotMethods.has(m));
    assert.deepEqual(unclassified, ['brandNewDangerousMethod']);
    // và assert M1 phía trên chính là cái fail build khi điều này xảy ra với zca thật
});

// ── invokeMethod guards (port assert từ .lab/lab.mjs) ────────────────────────

function expectCode(fn, code) {
    assert.throws(fn, (e) => e.code === code, `muốn code=${code}`);
}

test('guard: injection/không tồn tại → METHOD_NOT_ALLOWED (404)', () => {
    const api = fakeApiFromSnapshot();
    const allow = buildAllowlist(api);
    for (const m of ['__proto__', 'constructor', 'toString', 'nonExistentXyz', 'hasOwnProperty']) {
        expectCode(() => invokeMethod(api, allow, m, []), 'METHOD_NOT_ALLOWED');
    }
});

test('guard: DENY custom/getCookie/getContext → METHOD_DENIED (403)', () => {
    const api = fakeApiFromSnapshot();
    const allow = buildAllowlist(api);
    for (const m of ['custom', 'getCookie', 'getContext']) {
        expectCode(() => invokeMethod(api, allow, m, []), 'METHOD_DENIED');
    }
});

test('guard: 6 OUTBOUND send → OUTBOUND_USE_SEND_ENDPOINT (409), kể cả elevated', () => {
    const api = fakeApiFromSnapshot();
    const allow = buildAllowlist(api);
    for (const m of OUTBOUND_SEND_METHODS) {
        expectCode(() => invokeMethod(api, allow, m, []), 'OUTBOUND_USE_SEND_ENDPOINT');
        expectCode(() => invokeMethod(api, allow, m, [], { elevated: true }), 'OUTBOUND_USE_SEND_ENDPOINT');
    }
});

test('guard: 39 DESTRUCTIVE → DESTRUCTIVE_DENIED không elevated; elevated thì gọi được', () => {
    const api = fakeApiFromSnapshot();
    const allow = buildAllowlist(api);
    for (const m of DESTRUCTIVE_METHODS) {
        expectCode(() => invokeMethod(api, allow, m, []), 'DESTRUCTIVE_DENIED');
    }
    // review checklist: changeGroupOwner + updateGroupSettings phải nằm trong gate
    assert.ok(DESTRUCTIVE_METHODS.has('changeGroupOwner'));
    assert.ok(DESTRUCTIVE_METHODS.has('updateGroupSettings'));
    const out = invokeMethod(api, allow, 'changeGroupOwner', ['gid', 'uid'], { elevated: true });
    assert.equal(out.called, 'changeGroupOwner');
});

test('guard: MEDIA + binary → MEDIA_SPECIAL_ONLY (415) khỏi JSON dispatcher', () => {
    const api = fakeApiFromSnapshot();
    const allow = buildAllowlist(api);
    for (const m of [...MEDIA_METHODS, ...BINARY_METHODS]) {
        expectCode(() => invokeMethod(api, allow, m, []), 'MEDIA_SPECIAL_ONLY');
    }
});

test('guard: args — non-array 400, file-ref 400, quá cỡ 413; happy path chạy', () => {
    const api = fakeApiFromSnapshot();
    const allow = buildAllowlist(api);
    expectCode(() => invokeMethod(api, allow, 'getUserInfo', { 0: 'x' }), 'BAD_ARGS');
    expectCode(() => invokeMethod(api, allow, 'getGroupInfo', [{ path: '/etc/passwd' }]), 'FILE_REF_FORBIDDEN');
    expectCode(() => invokeMethod(api, allow, 'getGroupInfo', [{ attachments: ['/x'] }]), 'FILE_REF_FORBIDDEN');
    expectCode(() => invokeMethod(api, allow, 'getUserInfo', ['y'.repeat(70 * 1024)]), 'ARGS_TOO_LARGE');
    assert.equal(invokeMethod(api, allow, 'getOwnId', []).called, 'getOwnId');
});

// ── Event constants (P12 dựa vào) ────────────────────────────────────────────

test('event constants: 16 event, 5 wired + cipher_key không forward → còn 10', () => {
    assert.equal(ZCA_EVENTS.length, 16);
    assert.equal(WIRED_EVENTS.size, 5);
    assert.equal(NO_FORWARD_EVENTS.size, 6);
    assert.ok(NO_FORWARD_EVENTS.has('cipher_key'));
    const forwardable = ZCA_EVENTS.filter((e) => !NO_FORWARD_EVENTS.has(e));
    assert.equal(forwardable.length, 10);
});
