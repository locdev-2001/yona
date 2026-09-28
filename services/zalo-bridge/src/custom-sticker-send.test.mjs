import assert from 'node:assert/strict';
import test from 'node:test';

/** Nối dây của `index.mjs`: body có `custom_sticker` → đường sticker tự tạo, msgId vào bộ chống echo. */
process.env.BRIDGE_FETCH_HOST_ALLOWLIST = 'yona.test';
const { sendTextOrMediaThroughZca } = await import('./index.mjs');
const { CUSTOM_STICKER_METHOD } = await import('./custom-sticker.mjs');

const STATIC_URL = 'https://yona.test/storage/stickers/1/7/static-128.png';
const timing = { lap() {}, recordBytes() {} };

function fakeSlot() {
    const calls = [];
    const api = {
        zpwServiceMap: { file: ['https://files.zalo.test'] },
        custom(name, callback) {
            Object.defineProperty(api, name, { value: (props) => callback({ props }) });
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

test('custom_sticker đi đường sticker tự tạo, không gửi tệp, không gửi sticker gốc', async () => {
    const { slot, calls } = fakeSlot();

    const result = await sendTextOrMediaThroughZca(
        slot,
        { thread_id: '555', thread_type: 1, custom_sticker: { static_url: STATIC_URL, width: 128, height: 128 } },
        timing
    );

    assert.deepEqual(calls, [
        {
            name: CUSTOM_STICKER_METHOD,
            props: {
                sticker: { staticUrl: STATIC_URL, animationUrl: STATIC_URL, width: 128, height: 128 },
                threadId: '555',
                isGroup: true,
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
