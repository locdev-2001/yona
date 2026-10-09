import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Nối dây của `index.mjs`: body Laravel gửi sang → đường gửi nào của zca. Chạy trọn
 * từ tải tệp tới gọi zca (api giả), với ffmpeg/ffprobe giả trỏ qua env, nên không
 * cần ffmpeg thật trên máy chạy test.
 */
const THREAD_ID = '9876543210';
const VIDEO_CDN_URL = 'https://f21-zpc.zdn.vn/video/abc.mp4';
const THUMBNAIL_CDN_URL = 'https://f21-zpc.zdn.vn/jpg/anh-bia.jpg';

const toolsDir = mkdtempSync(path.join(tmpdir(), 'zbr-media-kind-tools-'));
writeFileSync(
    path.join(toolsDir, 'ffprobe'),
    `#!/bin/sh\n[ "$1" = "-version" ] && exit 0\necho '{"streams":[{"width":640,"height":360,"duration":"5.0"}]}'\n`,
    { mode: 0o755 }
);
writeFileSync(
    path.join(toolsDir, 'ffmpeg'),
    `#!/bin/sh\n[ "$1" = "-version" ] && exit 0\nfor last in "$@"; do :; done\n: > "$last"\n`,
    { mode: 0o755 }
);

const fileServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    res.end(Buffer.from('noi-dung-video-mp4'));
});
await new Promise((resolve) => fileServer.listen(0, '127.0.0.1', resolve));
const fileUrl = `http://127.0.0.1:${fileServer.address().port}/attachments/29/clip.mp4?signature=abc`;

process.env.FFMPEG_PATH = path.join(toolsDir, 'ffmpeg');
process.env.FFPROBE_PATH = path.join(toolsDir, 'ffprobe');
process.env.ZALO_NATIVE_VIDEO = '1';
process.env.ZALO_NATIVE_VOICE = '1';
process.env.BRIDGE_FETCH_HOST_ALLOWLIST = '127.0.0.1';
const { sendTextOrMediaThroughZca } = await import('./index.mjs');

after(() => {
    fileServer.closeAllConnections();
    fileServer.close();
    rmSync(toolsDir, { recursive: true, force: true });
});

function fakeSlot() {
    const calls = [];
    const record = (name, impl) => async (...args) => {
        calls.push({ name, args });
        return impl(...args);
    };
    const api = {
        uploadAttachment: record('uploadAttachment', (source) =>
            String(source).endsWith('.jpg')
                ? [{ fileType: 'image', normalUrl: THUMBNAIL_CDN_URL, hdUrl: THUMBNAIL_CDN_URL }]
                : [{ fileType: 'video', fileUrl: VIDEO_CDN_URL, fileId: '1' }]
        ),
        sendVideo: record('sendVideo', () => ({ msgId: 7001 })),
        sendVoice: record('sendVoice', () => ({ msgId: 7002 })),
        sendMessage: record('sendMessage', () => ({ message: null, attachment: [{ msgId: 8001 }] })),
    };
    return {
        slot: { api, outboundEchoIds: new Map() },
        callNames: () => calls.map((call) => call.name),
        callsTo: (name) => calls.filter((call) => call.name === name),
    };
}

const timing = { lap() {}, recordBytes() {} };

function mediaBody(mediaKind) {
    return {
        thread_id: THREAD_ID,
        thread_type: 0,
        file_url: fileUrl,
        media_kind: mediaKind,
        filename: 'Clip San Pham.mp4',
        content_type: 'video/mp4',
        message_id: 42,
    };
}

test('media_kind=video: tải tệp rồi đi đường video gốc (tải video + ảnh bìa lên, sendVideo), không gửi tệp', async () => {
    const { slot, callNames, callsTo } = fakeSlot();

    const result = await sendTextOrMediaThroughZca(slot, mediaBody('video'), timing);

    assert.deepEqual(callNames(), ['uploadAttachment', 'uploadAttachment', 'sendVideo']);
    const downloaded = callsTo('uploadAttachment')[0].args[0];
    assert.equal(path.basename(downloaded), 'Clip San Pham.mp4');
    assert.deepEqual(callsTo('sendVideo')[0].args, [
        { videoUrl: VIDEO_CDN_URL, thumbnailUrl: THUMBNAIL_CDN_URL, duration: 5000, width: 640, height: 360 },
        THREAD_ID,
        0,
    ]);
    assert.deepEqual(result, { source_id: '7001', source_ids: ['7001'] });
    assert.ok(slot.outboundEchoIds.has('7001'), 'msgId của video vào bộ chống echo');
    assert.equal(existsSync(path.dirname(downloaded)), false, 'thư mục tải tạm đã dọn');
});

test('media_kind=file: cùng tệp mp4 vẫn đi sendMessage dạng tệp, không đụng đường video gốc', async () => {
    const { slot, callNames, callsTo } = fakeSlot();

    const result = await sendTextOrMediaThroughZca(slot, mediaBody('file'), timing);

    assert.deepEqual(callNames(), ['sendMessage']);
    const [content, threadId, threadType] = callsTo('sendMessage')[0].args;
    assert.equal(path.basename(content.attachments[0]), 'Clip San Pham.mp4');
    assert.deepEqual([threadId, threadType], [THREAD_ID, 0]);
    assert.deepEqual(result, { source_id: '8001', source_ids: ['8001'] });
});

test('media_kind=voice: tải bản ghi, đổi sang m4a rồi tải lên và sendVoice bằng fileUrl, không gửi tệp', async () => {
    const { slot, callNames, callsTo } = fakeSlot();

    const result = await sendTextOrMediaThroughZca(
        slot,
        { ...mediaBody('voice'), filename: 'voice-message-20260929-101500.webm', content_type: 'audio/webm' },
        timing
    );

    assert.deepEqual(callNames(), ['uploadAttachment', 'sendVoice']);
    const uploaded = callsTo('uploadAttachment')[0].args[0];
    assert.equal(path.basename(uploaded), 'voice-message-20260929-101500-voice.m4a');
    assert.deepEqual(callsTo('sendVoice')[0].args, [{ voiceUrl: VIDEO_CDN_URL }, THREAD_ID, 0]);
    assert.deepEqual(result, { source_id: '7002', source_ids: ['7002'] });
    assert.ok(slot.outboundEchoIds.has('7002'), 'msgId của tin thoại vào bộ chống echo');
    assert.equal(existsSync(path.dirname(uploaded)), false, 'thư mục tải tạm đã dọn');
});

test('media_kind=audio: tệp âm thanh tải lên vẫn gửi dạng tệp, không thành tin thoại', async () => {
    const { slot, callNames } = fakeSlot();

    await sendTextOrMediaThroughZca(slot, { ...mediaBody('audio'), filename: 'nhac-cho.mp3', content_type: 'audio/mpeg' }, timing);

    assert.deepEqual(callNames(), ['sendMessage']);
});

function fakeAlbumSlot({ failOnPhotoRequest = null } = {}) {
    const uploads = [];
    const photoRequests = [];
    let nextMsgId = 9100;
    const utils = {
        encodeAES: (plain) => `enc(${plain})`,
        makeURL: (base, params) => `${base}?${new URLSearchParams(params)}`,
        request: async (url, options) => {
            if (failOnPhotoRequest === photoRequests.length) {
                throw Object.assign(new Error('Zalo từ chối'), { name: 'ZcaApiError' });
            }
            photoRequests.push({ url, params: JSON.parse(options.body.get('params').slice('enc('.length, -1)) });
            return {};
        },
        resolve: async () => ({ msgId: nextMsgId++ }),
    };
    const api = {
        zpwServiceMap: { file: ['https://files.zalo.test'] },
        custom(name, callback) {
            Object.defineProperty(api, name, { value: (props) => callback({ ctx: {}, utils, props }) });
        },
        uploadAttachment: async (paths) => {
            uploads.push(paths);
            return paths.map((filePath) => ({ fileType: 'image', photoId: filePath, width: 1, height: 1, totalSize: 1 }));
        },
        sendMessage: async () => {
            throw new Error('album không được đi sendMessage');
        },
    };

    return { slot: { api, outboundEchoIds: new Map() }, uploads, photoRequests };
}

function albumBody() {
    return {
        thread_id: THREAD_ID,
        thread_type: 0,
        text: 'Hai mẫu mới',
        album: [
            { file_url: fileUrl, filename: 'mau-1.jpg', content_type: 'image/jpeg' },
            { file_url: fileUrl, filename: 'mau-2.jpg', content_type: 'image/jpeg' },
        ],
        message_id: 43,
    };
}

test('album: tải mọi ảnh, gửi một khối có chú thích, mọi msgId vào bộ chống echo, dọn tệp tạm', async () => {
    const { slot, uploads, photoRequests } = fakeAlbumSlot();

    const result = await sendTextOrMediaThroughZca(slot, albumBody(), timing);

    assert.equal(uploads.length, 1);
    assert.deepEqual(uploads[0].map((filePath) => path.basename(filePath)), ['mau-1.jpg', 'mau-2.jpg']);
    assert.deepEqual(
        photoRequests.map((request) => [request.params.idInGroup, request.params.desc]),
        [
            [0, 'Hai mẫu mới'],
            [1, ''],
        ]
    );
    assert.deepEqual(result, { source_id: '9100', source_ids: ['9100', '9101'] });
    assert.ok(slot.outboundEchoIds.has('9100') && slot.outboundEchoIds.has('9101'));
    assert.ok(uploads[0].every((filePath) => !existsSync(filePath)), 'tệp tạm đã dọn');
});

test('album hỏng giữa khối: lỗi mang msgId ảnh đã gửi, ảnh đó vẫn vào bộ chống echo', async () => {
    const { slot } = fakeAlbumSlot({ failOnPhotoRequest: 1 });

    await assert.rejects(sendTextOrMediaThroughZca(slot, albumBody(), timing), (error) => {
        assert.deepEqual(error.sourceIds, ['9100']);
        return true;
    });
    assert.ok(slot.outboundEchoIds.has('9100'));
});
