import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    FORWARD_LEVEL,
    FORWARD_LOG_SRC_TYPE,
    buildForwardPayload,
    forwardedSourceIds,
    sendForwardOrFallback,
} from './forward-content.mjs';

const FORWARD = { msg_id: '8230000000001', ts: 1788700000000 };

function fakeApi({ forwardResult, forwardError } = {}) {
    const calls = [];
    return {
        calls,
        async forwardMessage(payload, threadIds, type) {
            calls.push(['forwardMessage', payload, threadIds, type]);
            if (forwardError) {
                throw forwardError;
            }
            return forwardResult ?? { success: [{ clientId: '1', msgId: 9911 }], fail: [] };
        },
        async sendMessage(content, threadId, type) {
            calls.push(['sendMessage', content, threadId, type]);
            return { message: { msgId: 7722 }, attachment: [] };
        },
    };
}

function zaloRejected(message = 'Tham số không hợp lệ') {
    const error = new Error(message);
    error.name = 'ZcaApiError';
    return error;
}

test('buildForwardPayload: đủ chữ + msg_id + ts → payload zca có reference', () => {
    assert.deepEqual(buildForwardPayload({ text: 'Còn size M không?', forward: FORWARD }), {
        message: 'Còn size M không?',
        reference: { id: '8230000000001', ts: 1788700000000, logSrcType: FORWARD_LOG_SRC_TYPE, fwLvl: FORWARD_LEVEL },
    });
    assert.equal(buildForwardPayload({ text: 'A', forward: { msg_id: 55, ts: '1788700000000' } }).reference.ts, 1788700000000);
});

test('buildForwardPayload: thiếu chữ, msg_id hoặc ts không phải số → null', () => {
    assert.equal(buildForwardPayload({ text: '  ', forward: FORWARD }), null);
    assert.equal(buildForwardPayload({ text: 'A', forward: { ts: 1 } }), null);
    assert.equal(buildForwardPayload({ text: 'A', forward: { msg_id: '1', ts: 'abc' } }), null);
    assert.equal(buildForwardPayload({ text: 'A', forward: { msg_id: '1', ts: -5 } }), null);
    assert.equal(buildForwardPayload({ text: 'A', forward: null }), null);
    assert.equal(buildForwardPayload({ text: 'A' }), null);
});

test('forwardedSourceIds: lấy msgId thành chuỗi, bỏ rỗng; đầu vào rác → []', () => {
    assert.deepEqual(forwardedSourceIds({ success: [{ msgId: 123 }, { msgId: '' }, {}], fail: [] }), ['123']);
    assert.deepEqual(forwardedSourceIds({ success: [], fail: [{ error_code: '1' }] }), []);
    assert.deepEqual(forwardedSourceIds(null), []);
    assert.deepEqual(forwardedSourceIds({ success: 'x' }), []);
});

test('sendForwardOrFallback: chuyển tiếp gốc thành công → gọi forwardMessage đúng một lần, trả msgId', async () => {
    const api = fakeApi();

    const result = await sendForwardOrFallback(api, { text: 'Còn size M không?', forward: FORWARD, threadId: '99', threadType: 0 });

    assert.deepEqual(result, { msgId: '9911' });
    assert.equal(api.calls.length, 1);
    assert.deepEqual(api.calls[0], [
        'forwardMessage',
        buildForwardPayload({ text: 'Còn size M không?', forward: FORWARD }),
        ['99'],
        0,
    ]);
});

test('sendForwardOrFallback: Zalo từ chối → gửi lại nội dung bằng sendMessage một lần', async () => {
    const api = fakeApi({ forwardError: zaloRejected() });

    const result = await sendForwardOrFallback(api, { text: 'Còn size M không?', forward: FORWARD, threadId: '99', threadType: 1 });

    assert.deepEqual(result, { message: { msgId: 7722 }, attachment: [] });
    assert.deepEqual(
        api.calls.map(([name]) => name),
        ['forwardMessage', 'sendMessage'],
    );
    assert.deepEqual(api.calls[1], ['sendMessage', { msg: 'Còn size M không?' }, '99', 1]);
});

test('sendForwardOrFallback: không có mục thành công → rơi về sendMessage', async () => {
    const api = fakeApi({ forwardResult: { success: [], fail: [{ clientId: '1', error_code: '114' }] } });

    await sendForwardOrFallback(api, { text: 'A', forward: FORWARD, threadId: '99', threadType: 0 });

    assert.deepEqual(
        api.calls.map(([name]) => name),
        ['forwardMessage', 'sendMessage'],
    );
});

test('sendForwardOrFallback: lỗi mạng/lỗi lạ → ném tiếp, KHÔNG gửi lại', async () => {
    const api = fakeApi({ forwardError: new TypeError('fetch failed') });

    await assert.rejects(
        sendForwardOrFallback(api, { text: 'A', forward: FORWARD, threadId: '99', threadType: 0 }),
        /fetch failed/,
    );
    assert.deepEqual(
        api.calls.map(([name]) => name),
        ['forwardMessage'],
    );
});

test('sendForwardOrFallback: payload không hợp lệ → dùng thẳng sendMessage', async () => {
    const api = fakeApi();

    await sendForwardOrFallback(api, { text: 'A', forward: { msg_id: '' }, threadId: '99', threadType: 0 });

    assert.deepEqual(api.calls, [['sendMessage', { msg: 'A' }, '99', 0]]);
});
