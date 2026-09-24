import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSendMessageContent } from './send-content.mjs';

const QUOTE = {
    msgId: '8230000000001',
    cliMsgId: '1788700000001',
    uidFrom: '8800000000000002',
    msgType: 'webchat',
    ts: '1788700000000',
    content: 'Chào shop, còn hàng không?',
    ttl: 0,
    propertyExt: null,
};

test('tin chữ + trích dẫn hợp lệ → { msg, quote }', () => {
    assert.deepEqual(buildSendMessageContent({ text: 'Dạ còn ạ', quote: QUOTE }), { msg: 'Dạ còn ạ', quote: QUOTE });
});

test('trích dẫn thiếu msgId hoặc không phải object thì bỏ', () => {
    const { msgId: _missing, ...withoutMsgId } = QUOTE;

    assert.deepEqual(buildSendMessageContent({ text: 'A', quote: withoutMsgId }), { msg: 'A' });
    assert.deepEqual(buildSendMessageContent({ text: 'A', quote: 'msg-1' }), { msg: 'A' });
    assert.deepEqual(buildSendMessageContent({ text: 'A', quote: [QUOTE] }), { msg: 'A' });
    assert.deepEqual(buildSendMessageContent({ text: 'A', quote: null }), { msg: 'A' });
});

test('tệp + chú thích + trích dẫn → giữ cả ba', () => {
    assert.deepEqual(buildSendMessageContent({ text: 'Mẫu đây ạ', quote: QUOTE, attachmentPath: '/tmp/zbr-1.png' }), {
        msg: 'Mẫu đây ạ',
        attachments: ['/tmp/zbr-1.png'],
        quote: QUOTE,
    });
});

test('tệp không chú thích + trích dẫn → msg rỗng, vẫn chuyển quote cho zca tự quyết', () => {
    assert.deepEqual(buildSendMessageContent({ text: '   ', quote: QUOTE, attachmentPath: '/tmp/zbr-2.pdf' }), {
        msg: '',
        attachments: ['/tmp/zbr-2.pdf'],
        quote: QUOTE,
    });
});

test('nhánh tệp với text null/undefined → msg rỗng', () => {
    assert.deepEqual(buildSendMessageContent({ text: null, attachmentPath: '/tmp/a.png' }), {
        msg: '',
        attachments: ['/tmp/a.png'],
    });
    assert.deepEqual(buildSendMessageContent({ attachmentPath: '/tmp/a.png' }), { msg: '', attachments: ['/tmp/a.png'] });
});
