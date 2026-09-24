import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startSendTiming } from './send-timing.mjs';

function fakeClock(...readings) {
    return () => readings.shift();
}

test('mỗi chặng tính từ mốc trước, tổng tính từ lúc bắt đầu', () => {
    const timing = startSendTiming({
        messageId: 160,
        mediaKind: 'image',
        now: fakeClock(1000, 1450.4, 3200.6, 3210),
    });

    timing.lap('download');
    timing.recordBytes(211122);
    timing.lap('zalo_send');

    assert.deepEqual(timing.summary({ ok: true }), {
        message_id: '160',
        media_kind: 'image',
        bytes: 211122,
        download_ms: 450,
        zalo_send_ms: 1750,
        total_ms: 2210,
        ok: true,
    });
});

test('tin chữ không có chặng tải tệp; message_id lạ không lọt vào log', () => {
    const timing = startSendTiming({ messageId: '12; rm -rf', now: fakeClock(0, 820, 900) });

    timing.lap('zalo_send');

    assert.deepEqual(timing.summary({ ok: false }), {
        message_id: null,
        media_kind: 'text',
        bytes: null,
        zalo_send_ms: 820,
        total_ms: 900,
        ok: false,
    });
});
