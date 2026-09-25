import test from 'node:test';
import assert from 'node:assert/strict';

import {
    decryptWithFallback,
    encryptSessionPayload,
    isEncryptedEnvelope,
    loadSessionKeys,
    parseSessionKey,
} from './session-crypto.mjs';

const KEY_A_B64 = Buffer.alloc(32, 1).toString('base64');
const KEY_B_B64 = Buffer.alloc(32, 2).toString('base64');
const KEY_A_HEX = Buffer.alloc(32, 1).toString('hex');

test('parseSessionKey chấp nhận base64 32 byte', () => {
    const key = parseSessionKey(KEY_A_B64);
    assert.ok(Buffer.isBuffer(key));
    assert.equal(key.length, 32);
});

test('parseSessionKey chấp nhận hex 64 ký tự', () => {
    const key = parseSessionKey(KEY_A_HEX);
    assert.ok(Buffer.isBuffer(key));
    assert.equal(key.length, 32);
    assert.deepEqual(key, parseSessionKey(KEY_A_B64));
});

test('parseSessionKey từ chối chuỗi sai độ dài hoặc rỗng', () => {
    assert.equal(parseSessionKey(''), null);
    assert.equal(parseSessionKey('too-short'), null);
    assert.equal(parseSessionKey(Buffer.alloc(16).toString('base64')), null);
});

test('loadSessionKeys ném lỗi khi BRIDGE_SESSION_KEY được đặt nhưng sai định dạng', () => {
    assert.throws(() => loadSessionKeys({ BRIDGE_SESSION_KEY: 'khong-hop-le' }), /BRIDGE_SESSION_KEY/);
});

test('loadSessionKeys ném lỗi khi BRIDGE_SESSION_KEY_PREVIOUS sai định dạng', () => {
    assert.throws(
        () => loadSessionKeys({ BRIDGE_SESSION_KEY: KEY_A_B64, BRIDGE_SESSION_KEY_PREVIOUS: 'x' }),
        /BRIDGE_SESSION_KEY_PREVIOUS/
    );
});

test('loadSessionKeys trả null cho phần vắng mặt, không ném lỗi', () => {
    const keys = loadSessionKeys({});
    assert.equal(keys.current, null);
    assert.equal(keys.previous, null);
});

test('mã hoá rồi giải mã trả đúng bản gốc (roundtrip)', () => {
    const key = parseSessionKey(KEY_A_B64);
    const plaintext = JSON.stringify({ cookie: [{ key: 'a', value: 'b' }], imei: 'abc-123' });

    const envelope = JSON.parse(encryptSessionPayload(plaintext, key));

    assert.ok(isEncryptedEnvelope(envelope));
    assert.equal(decryptWithFallback(envelope, { current: key }), plaintext);
});

test('isEncryptedEnvelope trả false cho JSON phẳng của tệp cookie bản cũ', () => {
    assert.equal(isEncryptedEnvelope({ cookie: 'plaintext', imei: 'x' }), false);
    assert.equal(isEncryptedEnvelope(null), false);
    assert.equal(isEncryptedEnvelope('chuoi'), false);
});

test('decryptWithFallback thử khoá cũ khi khoá hiện tại sai (xoay khoá)', () => {
    const keyA = parseSessionKey(KEY_A_B64);
    const keyB = parseSessionKey(KEY_B_B64);
    const plaintext = 'du-lieu-bi-mat';
    const envelope = JSON.parse(encryptSessionPayload(plaintext, keyA));

    assert.equal(decryptWithFallback(envelope, { current: keyB, previous: keyA }), plaintext);
});

test('decryptWithFallback ném lỗi khi sai khoá và không có khoá cũ', () => {
    const keyA = parseSessionKey(KEY_A_B64);
    const keyB = parseSessionKey(KEY_B_B64);
    const envelope = JSON.parse(encryptSessionPayload('data', keyA));

    assert.throws(() => decryptWithFallback(envelope, { current: keyB }));
});

test('decryptWithFallback ném lỗi khi không có khoá nào', () => {
    const keyA = parseSessionKey(KEY_A_B64);
    const envelope = JSON.parse(encryptSessionPayload('data', keyA));

    assert.throws(() => decryptWithFallback(envelope, {}));
});

test('decryptWithFallback ném lỗi khi auth tag bị chỉnh sửa (dữ liệu bị thay đổi)', () => {
    const key = parseSessionKey(KEY_A_B64);
    const envelope = JSON.parse(encryptSessionPayload('data', key));
    envelope.tag = Buffer.alloc(16, 0xaa).toString('base64');

    assert.throws(() => decryptWithFallback(envelope, { current: key }));
});
