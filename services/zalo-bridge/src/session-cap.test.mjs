import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_MAX_SESSIONS, countActiveSlots, resolveMaxSessions, sessionCapExceeded } from './session-cap.mjs';

test('resolveMaxSessions dùng mặc định khi biến vắng mặt hoặc rác', () => {
    assert.equal(resolveMaxSessions({}), DEFAULT_MAX_SESSIONS);
    assert.equal(resolveMaxSessions({ BRIDGE_MAX_SESSIONS: '0' }), DEFAULT_MAX_SESSIONS);
    assert.equal(resolveMaxSessions({ BRIDGE_MAX_SESSIONS: '-5' }), DEFAULT_MAX_SESSIONS);
    assert.equal(resolveMaxSessions({ BRIDGE_MAX_SESSIONS: 'khong-phai-so' }), DEFAULT_MAX_SESSIONS);
});

test('resolveMaxSessions đọc số hợp lệ từ env', () => {
    assert.equal(resolveMaxSessions({ BRIDGE_MAX_SESSIONS: '5' }), 5);
    assert.equal(resolveMaxSessions({ BRIDGE_MAX_SESSIONS: '120.9' }), 120);
});

test('countActiveSlots chỉ đếm slot đang giữ tài nguyên thật (qr_waiting/logging_in/ready)', () => {
    const slots = new Map([
        ['1', { loginPhase: 'ready' }],
        ['2', { loginPhase: 'qr_waiting' }],
        ['3', { loginPhase: 'logging_in' }],
        ['4', { loginPhase: 'idle' }],
        ['5', { loginPhase: 'error' }],
        ['6', {}],
    ]);

    assert.equal(countActiveSlots(slots), 3);
});

test('sessionCapExceeded so đúng >= hạn mức', () => {
    const slots = new Map([
        ['1', { loginPhase: 'ready' }],
        ['2', { loginPhase: 'ready' }],
    ]);

    assert.equal(sessionCapExceeded(slots, 2), true);
    assert.equal(sessionCapExceeded(slots, 3), false);
});

test('slot rỗng (Map trống) không bao giờ vượt hạn mức dương', () => {
    assert.equal(sessionCapExceeded(new Map(), 1), false);
});
