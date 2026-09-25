import test from 'node:test';
import assert from 'node:assert/strict';

import { countActiveSlots, sessionCapExceeded } from './session-cap.mjs';

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
