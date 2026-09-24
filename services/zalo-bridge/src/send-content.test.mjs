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

const MENTIONS = [{ uid: '555', pos: 0, len: 5 }];

test('nhóm: tin chữ mang nhắc tên đã lọc theo chữ', () => {
    assert.deepEqual(
        buildSendMessageContent({
            text: '@Bình xem giúp',
            mentions: [...MENTIONS, { uid: '9', pos: 40, len: 3 }],
            isGroup: true,
        }),
        { msg: '@Bình xem giúp', mentions: MENTIONS },
    );
});

test('chat 1-1 hoặc không có mục hợp lệ thì không gắn mentions', () => {
    assert.deepEqual(buildSendMessageContent({ text: '@Bình xem giúp', mentions: MENTIONS }), { msg: '@Bình xem giúp' });
    assert.deepEqual(buildSendMessageContent({ text: '@Bình', mentions: [{ uid: '', pos: 0, len: 5 }], isGroup: true }), {
        msg: '@Bình',
    });
});

test('nhóm: tệp + chú thích + trích dẫn + nhắc tên → giữ cả bốn', () => {
    assert.deepEqual(
        buildSendMessageContent({
            text: '@Bình ảnh đơn đây',
            quote: QUOTE,
            attachmentPath: '/tmp/zbr-3.jpg',
            mentions: MENTIONS,
            isGroup: true,
        }),
        { msg: '@Bình ảnh đơn đây', attachments: ['/tmp/zbr-3.jpg'], quote: QUOTE, mentions: MENTIONS },
    );
});

test('nhóm: tệp không chú thích thì bỏ nhắc tên (không có chữ để bám)', () => {
    assert.deepEqual(
        buildSendMessageContent({ text: '', attachmentPath: '/tmp/zbr-4.pdf', mentions: MENTIONS, isGroup: true }),
        { msg: '', attachments: ['/tmp/zbr-4.pdf'] },
    );
});
