/**
 * Self-check redact.mjs (Lô 1 / 1.7: log mặc định không mang nội dung tin, uid
 * đầy đủ hay token QR đầy đủ).
 * Chạy: node --test src/redact.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debugLogEnabled, maskUid, rawPayloadLogEnabled, rawPayloadLogWarning, shortToken } from './redact.mjs';

test('1.7: dump raw payload là opt-IN — không cờ thì im (trước đây mặc định BẬT)', () => {
    assert.equal(rawPayloadLogEnabled({}), false);
    assert.equal(rawPayloadLogEnabled({ ZALO_BRIDGE_LOG_QUOTE: '0' }), false);
    assert.equal(rawPayloadLogEnabled({ ZALO_BRIDGE_LOG_QUOTE: 'true' }), false);
    assert.equal(rawPayloadLogEnabled({ ZALO_BRIDGE_LOG_QUOTE: '1' }), true);
    assert.equal(rawPayloadLogEnabled({ ZALO_BRIDGE_DEBUG_LOG: '1' }), true);
});

test('debugLogEnabled chỉ nhận đúng "1"', () => {
    assert.equal(debugLogEnabled({}), false);
    assert.equal(debugLogEnabled({ ZALO_BRIDGE_DEBUG_LOG: '1' }), true);
});

test('1.7: token QR trong log chỉ còn 8 ký tự đầu', () => {
    assert.equal(shortToken('0f2c1a4b-9d3e-4f11-8a7c-1b2c3d4e5f60'), '0f2c1a4b…');
    assert.equal(shortToken('abc'), 'abc');
    assert.equal(shortToken(''), '');
    assert.equal(shortToken(null), '');
});

test('1.7: uid Zalo chỉ còn 4 số cuối', () => {
    assert.equal(maskUid('1234567890'), '******7890');
    assert.equal(maskUid('12'), '**');
    assert.equal(maskUid(''), '');
});

test('1.7: bật dump raw ở production → cảnh báo lúc boot', () => {
    assert.equal(rawPayloadLogWarning({ NODE_ENV: 'production' }), null);
    assert.equal(rawPayloadLogWarning({ ZALO_BRIDGE_LOG_QUOTE: '1' }), null);
    assert.match(
        String(rawPayloadLogWarning({ NODE_ENV: 'production', ZALO_BRIDGE_LOG_QUOTE: '1' })),
        /CANH BAO/
    );
});
