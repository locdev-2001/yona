import assert from 'node:assert/strict';
import test from 'node:test';

import { collectSourceIdsFromSendResult } from './media-fetch.mjs';
import { INVALID_ALBUM, PartialSendError, isAlbumPhotoPath, parseAlbumItems, sendPhotoAlbum } from './send-album.mjs';

const FILE_SERVICE = 'https://files.zalo.test';
const THREAD_ID = '9876543210';
const QUOTE = { msgId: '111', cliMsgId: '222', uidFrom: '333', msgType: 'webchat', ts: 1, content: 'gốc', ttl: 0 };

/**
 * Giả zca-js 2.1.2: `custom()` khai thuộc tính không ghi; `uploadAttachment` trả
 * kết quả theo đúng thứ tự tệp vào; mỗi ảnh gửi đi Zalo trả một msgId.
 */
function fakeZcaApi({ maxFile = 50, failOnPhotoRequest = null } = {}) {
    const calls = [];
    const photoRequests = [];
    let nextMsgId = 9000;
    const ctx = { settings: { features: { sharefile: { max_file: maxFile } } } };
    const utils = {
        encodeAES: (plain) => `enc(${plain})`,
        makeURL: (base, params) => `${base}?${new URLSearchParams(params)}`,
        request: async (url, options) => {
            if (failOnPhotoRequest === photoRequests.length) {
                throw Object.assign(new Error('Zalo từ chối'), { name: 'ZcaApiError' });
            }
            photoRequests.push({ url, params: JSON.parse(options.body.get('params').slice('enc('.length, -1)) });
            return { fake: true };
        },
        resolve: async () => ({ msgId: nextMsgId++ }),
    };
    const api = {
        zpwServiceMap: { file: [FILE_SERVICE] },
        custom(name, callback) {
            Object.defineProperty(api, name, {
                value: (props) => callback({ ctx, utils, props }),
                writable: false,
                enumerable: false,
                configurable: false,
            });
        },
        uploadAttachment: async (paths, threadId, threadType) => {
            calls.push({ name: 'uploadAttachment', args: [paths, threadId, threadType] });
            return paths.map((filePath, index) => ({
                fileType: 'image',
                photoId: `photo-${filePath}`,
                width: 800 + index,
                height: 600,
                totalSize: 1000 + index,
                normalUrl: `https://cdn.zalo.test/n/${filePath}`,
                hdUrl: `https://cdn.zalo.test/hd/${filePath}`,
                thumbUrl: `https://cdn.zalo.test/t/${filePath}`,
            }));
        },
        sendMessage: async (content, threadId, threadType) => {
            calls.push({ name: 'sendMessage', args: [content, threadId, threadType] });
            return content.attachments
                ? { message: null, attachment: [{ msgId: nextMsgId++ }] }
                : { message: { msgId: nextMsgId++ }, attachment: [] };
        },
    };

    return { api, calls, photoRequests, callsTo: (name) => calls.filter((call) => call.name === name) };
}

function send(api, overrides = {}) {
    return sendPhotoAlbum(api, {
        paths: ['/tmp/a.jpg', '/tmp/b.png', '/tmp/c.webp'],
        text: 'Mẫu mới về nè',
        threadId: THREAD_ID,
        threadType: 0,
        isGroup: false,
        ...overrides,
    });
}

test('ba ảnh kèm chữ: một lượt tải lên, ba ảnh chung một khối không chú thích, chữ thành tin riêng ngay sau', async () => {
    const { api, calls, callsTo, photoRequests } = fakeZcaApi();

    const result = await send(api);

    assert.deepEqual(
        calls.map((call) => call.name),
        ['uploadAttachment', 'sendMessage']
    );
    assert.deepEqual(callsTo('sendMessage')[0].args, [{ msg: 'Mẫu mới về nè' }, THREAD_ID, 0]);
    assert.deepEqual(callsTo('uploadAttachment')[0].args, [['/tmp/a.jpg', '/tmp/b.png', '/tmp/c.webp'], THREAD_ID, 0]);
    assert.equal(photoRequests.length, 3);
    assert.ok(photoRequests.every((request) => request.url.startsWith(`${FILE_SERVICE}/api/message/photo_original/send?`)));

    const params = photoRequests.map((request) => request.params);
    const groupLayoutId = params[0].groupLayoutId;
    assert.ok(groupLayoutId);
    assert.deepEqual(
        params.map((p) => [p.groupLayoutId, p.isGroupLayout, p.idInGroup, p.totalItemInGroup, p.desc]),
        [
            [groupLayoutId, 1, 0, 3, ''],
            [groupLayoutId, 1, 1, 3, ''],
            [groupLayoutId, 1, 2, 3, ''],
        ]
    );
    assert.equal(params[0].extMsgProp, `{"groupMediaMsg":{"groupLayoutId":"${groupLayoutId}"}}`);
    assert.equal(params[0].photoId, 'photo-/tmp/a.jpg');
    assert.equal(params[0].toid, THREAD_ID);
    assert.equal(params[0].normalUrl, 'https://cdn.zalo.test/n//tmp/a.jpg');
    assert.equal(params[0].grid, undefined);
    assert.equal(new Set(params.map((p) => p.clientId)).size, 3, 'mỗi ảnh một clientId');

    assert.deepEqual(collectSourceIdsFromSendResult(result), ['9000', '9001', '9002', '9003']);
});

test('trả lời trích dẫn: khối ảnh đi trước, tin chữ mang trích dẫn đi sau', async () => {
    const { api, calls, callsTo } = fakeZcaApi();

    const result = await send(api, { quote: QUOTE });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['uploadAttachment', 'sendMessage']
    );

    const [content, threadId] = callsTo('sendMessage')[0].args;
    assert.deepEqual(content, { msg: 'Mẫu mới về nè', quote: QUOTE });
    assert.equal(threadId, THREAD_ID);
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['9000', '9001', '9002', '9003']);
});

test('nhóm có nhắc tên: tin chữ mang nhắc tên, ảnh gửi theo khuôn nhóm (grid, oriUrl)', async () => {
    const { api, callsTo, photoRequests } = fakeZcaApi();

    await send(api, { text: '@Bình xem mẫu', mentions: [{ uid: '555', pos: 0, len: 5 }], threadType: 1, isGroup: true });

    assert.deepEqual(callsTo('sendMessage')[0].args[0], { msg: '@Bình xem mẫu', mentions: [{ uid: '555', pos: 0, len: 5 }] });
    const params = photoRequests[0].params;
    assert.ok(photoRequests[0].url.startsWith(`${FILE_SERVICE}/api/group/photo_original/send?`));
    assert.equal(params.grid, THREAD_ID);
    assert.equal(params.oriUrl, 'https://cdn.zalo.test/n//tmp/a.jpg');
    assert.equal(params.toid, undefined);
    assert.equal(params.desc, '');
});

test('chữ chỉ có khoảng trắng: không sinh tin chữ', async () => {
    const { api, callsTo, photoRequests } = fakeZcaApi();

    await send(api, { text: '   ', quote: QUOTE });

    assert.equal(callsTo('sendMessage').length, 0);
    assert.equal(photoRequests[0].params.desc, '');
});

test('vượt trần số tệp mỗi lượt của phiên: chia nhiều khối', async () => {
    const { api, callsTo, photoRequests } = fakeZcaApi({ maxFile: 2 });

    await send(api, { paths: ['/tmp/1.jpg', '/tmp/2.jpg', '/tmp/3.jpg', '/tmp/4.jpg'] });

    assert.deepEqual(
        callsTo('uploadAttachment').map((call) => call.args[0]),
        [
            ['/tmp/1.jpg', '/tmp/2.jpg'],
            ['/tmp/3.jpg', '/tmp/4.jpg'],
        ]
    );
    const params = photoRequests.map((request) => request.params);
    assert.deepEqual(
        params.map((p) => [p.idInGroup, p.totalItemInGroup, p.desc]),
        [
            [0, 2, ''],
            [1, 2, ''],
            [0, 2, ''],
            [1, 2, ''],
        ]
    );
});

test('ảnh đuôi Zalo không xếp vào ảnh vẫn đi riêng sau khối; dưới hai ảnh thì gửi từng tệp; chữ luôn đi cuối', async () => {
    const mixed = fakeZcaApi();
    await send(mixed.api, { paths: ['/tmp/a.jpg', '/tmp/b.heic', '/tmp/c.png'] });
    assert.deepEqual(mixed.callsTo('uploadAttachment')[0].args[0], ['/tmp/a.jpg', '/tmp/c.png']);
    assert.deepEqual(
        mixed.callsTo('sendMessage').map((call) => call.args[0]),
        [{ msg: '', attachments: ['/tmp/b.heic'] }, { msg: 'Mẫu mới về nè' }]
    );

    const single = fakeZcaApi();
    await send(single.api, { paths: ['/tmp/a.jpg', '/tmp/b.heic'], quote: QUOTE });
    assert.equal(single.callsTo('uploadAttachment').length, 0);
    assert.deepEqual(
        single.callsTo('sendMessage').map((call) => call.args[0]),
        [
            { msg: '', attachments: ['/tmp/a.jpg'] },
            { msg: '', attachments: ['/tmp/b.heic'] },
            { msg: 'Mẫu mới về nè', quote: QUOTE },
        ]
    );
});

test('hỏng giữa khối: lỗi mang msgId các ảnh đã tới khách', async () => {
    const { api } = fakeZcaApi({ failOnPhotoRequest: 1 });

    await assert.rejects(send(api), (error) => {
        assert.ok(error instanceof PartialSendError);
        assert.equal(error.name, 'ZcaApiError');
        assert.deepEqual(collectSourceIdsFromSendResult(error.sentResult), ['9000']);
        return true;
    });
});

test('isAlbumPhotoPath: chỉ đuôi zca xếp vào ảnh, không phân biệt hoa thường', () => {
    assert.equal(isAlbumPhotoPath('/tmp/a.JPG'), true);
    assert.equal(isAlbumPhotoPath('/tmp/a.webp'), true);
    assert.equal(isAlbumPhotoPath('/tmp/a.gif'), false);
    assert.equal(isAlbumPhotoPath('/tmp/a.heic'), false);
    assert.equal(isAlbumPhotoPath(null), false);
});

test('parseAlbumItems: vắng thì null, đủ khuôn thì chuẩn hoá, sai khuôn thì lỗi 400', () => {
    assert.equal(parseAlbumItems(undefined), null);
    assert.equal(parseAlbumItems(null), null);
    assert.deepEqual(parseAlbumItems([{ file_url: ' https://yona.test/a ', filename: 'a.jpg', content_type: 'image/jpeg' }, { file_url: 'https://yona.test/b' }]), [
        { fileUrl: 'https://yona.test/a', filename: 'a.jpg', contentType: 'image/jpeg' },
        { fileUrl: 'https://yona.test/b', filename: null, contentType: null },
    ]);
    for (const bad of [[], 'x', [{}], [{ file_url: '' }], [null], Array.from({ length: 101 }, () => ({ file_url: 'https://yona.test/a' }))]) {
        assert.throws(() => parseAlbumItems(bad), { message: INVALID_ALBUM });
    }
});
