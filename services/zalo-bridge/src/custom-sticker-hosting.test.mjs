import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';

import { createZaloStickerHost, flattenStickerToJpeg } from './custom-sticker-hosting.mjs';

const ALLOWED = new Set(['yona.test']);
const STATIC_URL = 'https://yona.test/storage/stickers/1/7/static-130.png';
const sticker = { staticUrl: STATIC_URL, animationUrl: 'https://yona.test/storage/stickers/1/7/sticker-130.webp', width: 130, height: 130 };

async function transparentPng() {
    const dir = await fs.mkdtemp(path.join(tmpdir(), 'zbr-'));
    const file = path.join(dir, 'zbr-file.png');
    await sharp({ create: { width: 4, height: 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(file);

    return file;
}

function fakeDeps() {
    const downloads = [];
    const uploads = [];
    const cleaned = [];
    const deps = {
        allowedHosts: ALLOWED,
        download: async (url, options) => {
            downloads.push({ url, options });
            return transparentPng();
        },
        cleanup: async (file) => {
            cleaned.push(file);
            await fs.rm(path.dirname(file), { recursive: true, force: true });
        },
    };
    const api = {
        uploadAttachment: async (file, threadId, threadType) => {
            const metadata = await sharp(file).metadata();
            uploads.push({ name: path.basename(file), format: metadata.format, threadId, threadType });
            return [{ fileType: 'image', normalUrl: 'https://f9-zpc.zdn.vn/1/sticker.jpg', hdUrl: 'https://b-f9-zpc.zdn.vn/1/sticker.jpg' }];
        },
    };

    return { deps, api, downloads, uploads, cleaned };
}

test('flattenStickerToJpeg: vùng trong suốt thành nền trắng, không để Zalo tự chọn màu', async () => {
    const source = await transparentPng();
    try {
        const jpeg = await flattenStickerToJpeg(source);
        const { data, info } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true });

        assert.equal(info.channels, 3);
        assert.deepEqual([...data.subarray(0, 3)], [255, 255, 255]);
    } finally {
        await fs.rm(path.dirname(source), { recursive: true, force: true });
    }
});

test('hostStickerOnZalo: tải ảnh tĩnh theo allowlist, đưa JPEG lên đúng luồng, giữ URL gốc của Yona', async () => {
    const { deps, api, downloads, uploads, cleaned } = fakeDeps();
    const host = createZaloStickerHost(deps);

    const hosted = await host(api, sticker, { threadId: 555, isGroup: true });

    assert.deepEqual(hosted, { ...sticker, zaloHostedUrl: 'https://b-f9-zpc.zdn.vn/1/sticker.jpg' });
    assert.equal(downloads[0].url, STATIC_URL);
    assert.equal(downloads[0].options.allowedHosts, ALLOWED);
    assert.deepEqual(uploads, [{ name: 'sticker.jpg', format: 'jpeg', threadId: '555', threadType: 1 }]);
    assert.equal(cleaned.length, 1);
});

test('hostStickerOnZalo: cùng phiên gửi lại cùng sticker không tải lên lần nữa, phiên khác thì có', async () => {
    const first = fakeDeps();
    const host = createZaloStickerHost(first.deps);
    const otherSession = { uploadAttachment: first.api.uploadAttachment };

    await host(first.api, sticker, { threadId: '1', isGroup: false });
    await host(first.api, sticker, { threadId: '2', isGroup: false });
    await host(otherSession, sticker, { threadId: '3', isGroup: false });

    assert.deepEqual(
        first.uploads.map((upload) => [upload.threadId, upload.threadType]),
        [['1', 0], ['3', 0]]
    );
});

test('hostStickerOnZalo: Zalo trả kết quả không có URL thì ném, vẫn dọn tệp tạm, không nhớ kết quả', async () => {
    const { deps, cleaned } = fakeDeps();
    const host = createZaloStickerHost(deps);
    const api = { uploadAttachment: async () => [{ fileType: 'image' }] };

    await assert.rejects(() => host(api, sticker, { threadId: '1', isGroup: false }), { message: 'upload_without_url' });
    await assert.rejects(() => host(api, sticker, { threadId: '1', isGroup: false }), { message: 'upload_without_url' });
    assert.equal(cleaned.length, 2);
});
