import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import sharp from 'sharp';

/** Nối dây của `index.mjs`: body có `custom_sticker` → đường sticker tự tạo, msgId vào bộ chống echo. */
process.env.BRIDGE_FETCH_HOST_ALLOWLIST = 'yona.test,127.0.0.1';
const { sendTextOrMediaThroughZca } = await import('./index.mjs');
const { CUSTOM_STICKER_METHOD } = await import('./custom-sticker.mjs');

const HOSTED_URL = 'https://b-f9-zpc.zdn.vn/1/sticker.jpg';
const stickerPng = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 200, g: 0, b: 0, alpha: 1 } } }).png().toBuffer();
const stickerServer = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'image/png' });
    response.end(stickerPng);
});
await new Promise((resolve) => stickerServer.listen(0, '127.0.0.1', resolve));
test.after(() => stickerServer.close());
const STATIC_URL = `http://127.0.0.1:${stickerServer.address().port}/storage/stickers/1/7/static-128.png`;
const timing = { lap() {}, recordBytes() {} };

function fakeSlot() {
    const calls = [];
    const api = {
        zpwServiceMap: { file: ['https://files.zalo.test'] },
        custom(name, callback) {
            Object.defineProperty(api, name, { value: (props) => callback({ props }) });
        },
        uploadAttachment: async (file, threadId, threadType) => {
            calls.push({ name: 'uploadAttachment', args: [threadId, threadType] });
            return [{ fileType: 'image', hdUrl: HOSTED_URL }];
        },
        sendSticker: async (...args) => calls.push({ name: 'sendSticker', args }),
        sendMessage: async (...args) => calls.push({ name: 'sendMessage', args }),
    };
    api.custom(CUSTOM_STICKER_METHOD, ({ props }) => {
        calls.push({ name: CUSTOM_STICKER_METHOD, props });
        return { msgId: 9101 };
    });

    return { slot: { api, outboundEchoIds: new Map() }, calls };
}

test('custom_sticker đưa ảnh lên CDN Zalo rồi đi đường sticker tự tạo, không gửi tệp, không gửi sticker gốc', async () => {
    const { slot, calls } = fakeSlot();

    const result = await sendTextOrMediaThroughZca(
        slot,
        { thread_id: '555', thread_type: 1, custom_sticker: { static_url: STATIC_URL, width: 128, height: 128 } },
        timing
    );

    assert.deepEqual(calls, [
        { name: 'uploadAttachment', args: ['555', 1] },
        {
            name: CUSTOM_STICKER_METHOD,
            props: {
                sticker: { staticUrl: STATIC_URL, animationUrl: STATIC_URL, zaloHostedUrl: HOSTED_URL, width: 128, height: 128 },
                threadId: '555',
                isGroup: true,
                layout: 'ai',
                fileService: 'https://files.zalo.test',
            },
        },
    ]);
    assert.deepEqual(result, { source_id: '9101', source_ids: ['9101'] });
    assert.ok(slot.outboundEchoIds.has('9101'));
});

test('custom_sticker trỏ host lạ thì từ chối trước khi gọi Zalo', async () => {
    const { slot, calls } = fakeSlot();

    await assert.rejects(
        sendTextOrMediaThroughZca(
            slot,
            { thread_id: '555', thread_type: 0, custom_sticker: { static_url: 'https://evil.test/a.png', width: 128, height: 128 } },
            timing
        ),
        { message: 'fetch_host_not_allowed' }
    );
    assert.deepEqual(calls, []);
});
