import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collectSourceIdsFromSendResult } from './media-fetch.mjs';
import { SEND_VIDEO_LOG_TAG, createVideoTools, parseProbeOutput, sendVideoOrFile, videoToolsFromEnv } from './send-video.mjs';

const THREAD_ID = '9876543210';
const THREAD_TYPE = 0;
const VIDEO_PATH = '/tmp/zbr-test/video_san_pham.mp4';
const VIDEO_CDN_URL = 'https://f21-zpc.zdn.vn/video/abc.mp4?token=bi-mat';
const THUMBNAIL_CDN_URL = 'https://f21-zpc.zdn.vn/jpg/anh-bia.jpg';
const QUOTE = { msgId: '8230000000001', cliMsgId: '1788700000001', uidFrom: '88', msgType: 'webchat', ts: '1', content: 'A' };

function zaloRejection(message = 'Zalo từ chối') {
    const error = new Error(message);
    error.name = 'ZaloApiError';
    return error;
}

/** Api zca giả: ghi lại từng lượt gọi, hành vi từng hàm đè được qua `overrides`. */
function fakeApi(overrides = {}) {
    const calls = [];
    const record = (name, impl) => async (...args) => {
        calls.push({ name, args });
        return impl(...args);
    };
    const api = {
        uploadAttachment: record(
            'uploadAttachment',
            overrides.uploadAttachment ??
                ((source) =>
                    String(source).endsWith('.jpg')
                        ? [{ fileType: 'image', normalUrl: THUMBNAIL_CDN_URL, hdUrl: THUMBNAIL_CDN_URL }]
                        : [{ fileType: 'video', fileUrl: VIDEO_CDN_URL, fileId: '1' }])
        ),
        sendVideo: record('sendVideo', overrides.sendVideo ?? (() => ({ msgId: 7001 }))),
        sendMessage: record(
            'sendMessage',
            overrides.sendMessage ??
                ((content) =>
                    content.attachments ? { message: null, attachment: [{ msgId: 8001 }] } : { message: { msgId: 9001 }, attachment: [] })
        ),
    };
    return { api, calls, callsTo: (name) => calls.filter((call) => call.name === name) };
}

function fakeTools({ enabled = true, available = true, probe, extractThumbnail, remuxToMp4 } = {}) {
    return {
        enabled,
        isAvailable: async () => available,
        probe: probe ?? (async () => ({ durationMs: 5500, width: 720, height: 1280 })),
        extractThumbnail: extractThumbnail ?? (async () => {}),
        remuxToMp4: remuxToMp4 ?? (async (_source, target) => fs.writeFile(target, 'mp4')),
    };
}

async function send({ api, tools = fakeTools(), content = { msg: '', attachments: [VIDEO_PATH] } }) {
    const warnings = [];
    const result = await sendVideoOrFile({
        api,
        content,
        threadId: THREAD_ID,
        threadType: THREAD_TYPE,
        tools,
        messageId: 42,
        warn: (tag, line) => warnings.push({ tag, entry: JSON.parse(line), line }),
    });
    return { result, warnings };
}

test('có ffmpeg: tải video + ảnh bìa lên rồi sendVideo đúng tham số, không gửi tệp', async () => {
    const { api, calls, callsTo } = fakeApi();

    const { result, warnings } = await send({ api });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['uploadAttachment', 'uploadAttachment', 'sendVideo']
    );
    assert.deepEqual(callsTo('uploadAttachment')[0].args, [VIDEO_PATH, THREAD_ID, THREAD_TYPE]);
    assert.match(callsTo('uploadAttachment')[1].args[0], /video_san_pham-thumbnail\.jpg$/);
    assert.deepEqual(callsTo('sendVideo')[0].args, [
        { videoUrl: VIDEO_CDN_URL, thumbnailUrl: THUMBNAIL_CDN_URL, duration: 5500, width: 720, height: 1280 },
        THREAD_ID,
        THREAD_TYPE,
    ]);
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['7001']);
    assert.deepEqual(warnings, []);
});

test('có chú thích + trích dẫn: tin chữ đi trước (giữ quote), video sau; đủ hai msgId, chữ là msgId chính', async () => {
    const { api, calls, callsTo } = fakeApi();

    const { result } = await send({ api, content: { msg: 'Mẫu mới ạ', attachments: [VIDEO_PATH], quote: QUOTE } });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['uploadAttachment', 'uploadAttachment', 'sendMessage', 'sendVideo']
    );
    assert.deepEqual(callsTo('sendMessage')[0].args[0], { msg: 'Mẫu mới ạ', quote: QUOTE });
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['9001', '7001']);
});

test('không có ffmpeg: rơi về gửi tệp nguyên nội dung, log một dòng cảnh báo', async () => {
    const { api, calls, callsTo } = fakeApi();
    const content = { msg: 'Mẫu mới ạ', attachments: [VIDEO_PATH], quote: QUOTE };

    const { result, warnings } = await send({ api, tools: fakeTools({ available: false }), content });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['sendMessage']
    );
    assert.deepEqual(callsTo('sendMessage')[0].args, [content, THREAD_ID, THREAD_TYPE]);
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['8001']);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].tag, SEND_VIDEO_LOG_TAG);
    assert.deepEqual(warnings[0].entry, { message_id: 42, fallback: 'file', stage: 'tools_missing', error: null });
});

test('tắt bằng env: gửi tệp nguyên nội dung, không dò công cụ, log bước disabled', async () => {
    const { api, calls } = fakeApi();
    let checked = false;
    const tools = { ...fakeTools({ enabled: false }), isAvailable: async () => ((checked = true), true) };

    const { warnings } = await send({ api, tools });

    assert.equal(checked, false);
    assert.deepEqual(
        calls.map((call) => call.name),
        ['sendMessage']
    );
    assert.deepEqual(warnings[0].entry, { message_id: 42, fallback: 'file', stage: 'disabled', error: null });
});

test('định dạng không đổi vỏ được (webm): gửi tệp như cũ, không đo, không tải lên', async () => {
    const { api, calls } = fakeApi();
    let probed = false;
    const tools = fakeTools({ probe: async () => ((probed = true), { durationMs: 1, width: 1, height: 1 }) });

    const { warnings } = await send({ api, tools, content: { msg: '', attachments: ['/tmp/zbr-test/clip.webm'] } });

    assert.equal(probed, false);
    assert.deepEqual(
        calls.map((call) => call.name),
        ['sendMessage']
    );
    assert.equal(warnings[0].entry.stage, 'not_mp4');
});

test('mov: đổi vỏ sang mp4 rồi gửi video gốc bằng tệp đã đổi vỏ; dọn tệp đổi vỏ và ảnh bìa', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'zbr-video-test-'));
    try {
        const movPath = path.join(dir, 'IMG_0421.mov');
        await fs.writeFile(movPath, 'mov');
        const remuxed = [];
        const probed = [];
        const tools = fakeTools({
            remuxToMp4: async (source, target) => {
                remuxed.push([source, target]);
                await fs.writeFile(target, 'mp4');
            },
            probe: async (videoPath) => (probed.push(videoPath), { durationMs: 3000, width: 1080, height: 1920 }),
            extractThumbnail: async (_video, thumbnail) => fs.writeFile(thumbnail, 'jpg'),
        });
        const { api, calls, callsTo } = fakeApi();

        const { result, warnings } = await send({ api, tools, content: { msg: '', attachments: [movPath] } });

        const [[source, target]] = remuxed;
        assert.equal(source, movPath);
        assert.equal(path.extname(target), '.mp4');
        assert.equal(path.dirname(target), dir);
        assert.deepEqual(probed, [target]);
        assert.deepEqual(
            calls.map((call) => call.name),
            ['uploadAttachment', 'uploadAttachment', 'sendVideo']
        );
        assert.equal(callsTo('uploadAttachment')[0].args[0], target);
        assert.deepEqual(collectSourceIdsFromSendResult(result), ['7001']);
        assert.deepEqual(warnings, []);
        assert.deepEqual(await fs.readdir(dir), ['IMG_0421.mov'], 'chỉ còn tệp gốc: tệp đổi vỏ và ảnh bìa đã dọn');
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('mov đổi vỏ lỗi: rơi về gửi tệp .mov gốc nguyên nội dung, log bước remux', async () => {
    const { api, calls, callsTo } = fakeApi();
    const content = { msg: 'Video mẫu ạ', attachments: ['/tmp/zbr-test/IMG_0421.mov'] };
    const tools = fakeTools({ remuxToMp4: async () => Promise.reject(new Error('Could not find tag for codec prores in stream #0')) });

    const { result, warnings } = await send({ api, tools, content });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['sendMessage']
    );
    assert.deepEqual(callsTo('sendMessage')[0].args[0], content);
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['8001']);
    assert.equal(warnings[0].entry.stage, 'remux');
});

test('mov bị Zalo từ chối sendVideo: tệp rơi về là .mov gốc, không phải bản đổi vỏ', async () => {
    const { api, callsTo } = fakeApi({ sendVideo: () => Promise.reject(zaloRejection()) });

    await send({ api, content: { msg: '', attachments: ['/tmp/zbr-test/IMG_0421.mov'] } });

    assert.deepEqual(callsTo('sendMessage')[0].args[0], { msg: '', attachments: ['/tmp/zbr-test/IMG_0421.mov'] });
});

for (const [stage, overrides, tools] of [
    ['probe', {}, fakeTools({ probe: async () => Promise.reject(new Error('probe_no_video_stream')) })],
    ['thumbnail', {}, fakeTools({ extractThumbnail: async () => Promise.reject(new Error('ffmpeg exited 1')) })],
    ['upload_video', { uploadAttachment: () => Promise.reject(zaloRejection()) }, fakeTools()],
    [
        'upload_thumbnail',
        { uploadAttachment: (source) => (String(source).endsWith('.jpg') ? [{ fileType: 'image' }] : [{ fileUrl: VIDEO_CDN_URL }]) },
        fakeTools(),
    ],
]) {
    test(`bước ${stage} lỗi: chưa gửi gì tới khách nên rơi về gửi tệp`, async () => {
        const { api, callsTo } = fakeApi(overrides);

        const { result, warnings } = await send({ api, tools });

        assert.equal(callsTo('sendVideo').length, 0);
        assert.deepEqual(callsTo('sendMessage')[0].args[0], { msg: '', attachments: [VIDEO_PATH] });
        assert.deepEqual(collectSourceIdsFromSendResult(result), ['8001']);
        assert.equal(warnings[0].entry.stage, stage);
    });
}

test('sendVideo bị Zalo từ chối: rơi về gửi tệp; chú thích đã gửi thì không gửi lại', async () => {
    const { api, calls, callsTo } = fakeApi({ sendVideo: () => Promise.reject(zaloRejection(`Unable to get video content: ${VIDEO_CDN_URL}`)) });

    const { result, warnings } = await send({ api, content: { msg: 'Mẫu mới ạ', attachments: [VIDEO_PATH] } });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['uploadAttachment', 'uploadAttachment', 'sendMessage', 'sendVideo', 'sendMessage']
    );
    assert.deepEqual(callsTo('sendMessage')[1].args[0], { msg: '', attachments: [VIDEO_PATH] });
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['9001', '8001']);
    assert.equal(warnings[0].entry.stage, 'send_video');
    assert.ok(!warnings[0].line.includes('bi-mat'), 'log không được chứa URL mang token');
    assert.match(warnings[0].entry.error, /^ZaloApiError: Unable to get video content: \[url\]/);
});

test('sendVideo lỗi mạng (có thể Zalo đã nhận): ném tiếp, không gửi thêm tệp', async () => {
    const { api, callsTo } = fakeApi({ sendVideo: () => Promise.reject(new TypeError('fetch failed')) });

    await assert.rejects(() => send({ api }), /fetch failed/);
    assert.equal(callsTo('sendMessage').length, 0);
});

test('parseProbeOutput: video quay dọc lưu ngang kèm góc xoay → đổi chiều; thời lượng lấy từ format khi stream thiếu', () => {
    const rotated = JSON.stringify({ streams: [{ width: 1920, height: 1080, side_data_list: [{ rotation: -90 }] }], format: { duration: '5.5' } });
    assert.deepEqual(parseProbeOutput(rotated), { durationMs: 5500, width: 1080, height: 1920 });

    const plain = JSON.stringify({ streams: [{ width: 320, height: 240, duration: '2.000000' }], format: {} });
    assert.deepEqual(parseProbeOutput(plain), { durationMs: 2000, width: 320, height: 240 });

    assert.throws(() => parseProbeOutput(JSON.stringify({ streams: [] })), /probe_no_video_stream/);
});

test('createVideoTools: dò ffmpeg/ffprobe một lần; thiếu một trong hai là không dùng được', async () => {
    const invoked = [];
    const tools = createVideoTools({
        ffmpegPath: '/opt/ffmpeg',
        ffprobePath: '/opt/ffprobe-khong-co',
        run: async (binary) => {
            invoked.push(binary);
            if (binary.endsWith('khong-co')) {
                throw new Error('ENOENT');
            }
            return 'ffmpeg version 8';
        },
    });

    assert.equal(await tools.isAvailable(), false);
    assert.equal(await tools.isAvailable(), false);
    assert.deepEqual(invoked, ['/opt/ffmpeg', '/opt/ffprobe-khong-co']);
});

test('videoToolsFromEnv: mặc định bật; ZALO_NATIVE_VIDEO=0/false/off tắt hẳn, không dò công cụ', async () => {
    const invoked = [];
    const run = async (binary) => (invoked.push(binary), 'ffmpeg version 8');

    const enabled = videoToolsFromEnv({ FFMPEG_PATH: '/opt/ffmpeg', FFPROBE_PATH: '/opt/ffprobe' }, { run });
    assert.equal(enabled.enabled, true);
    assert.equal(await enabled.isAvailable(), true);
    assert.deepEqual(invoked, ['/opt/ffmpeg', '/opt/ffprobe']);

    for (const value of ['0', 'false', 'OFF', ' no ']) {
        const disabled = videoToolsFromEnv({ ZALO_NATIVE_VIDEO: value }, { run });
        assert.equal(disabled.enabled, false, value);
        assert.equal(await disabled.isAvailable(), false, value);
    }
    assert.equal(invoked.length, 2, 'tắt thì không chạy ffmpeg/ffprobe');
    assert.equal(videoToolsFromEnv({ ZALO_NATIVE_VIDEO: '1' }, { run }).enabled, true);
});

/** ffmpeg ≥ 7 đặt góc xoay bằng `-display_rotation`; bản cũ hơn chỉ hiểu thẻ `rotate`. */
function rotateWithoutReencode(source, target) {
    const quiet = ['-hide_banner', '-loglevel', 'error', '-y'];
    try {
        execFileSync('ffmpeg', [...quiet, '-display_rotation', '90', '-i', source, '-c', 'copy', target]);
    } catch {
        execFileSync('ffmpeg', [...quiet, '-i', source, '-c', 'copy', '-metadata:s:v:0', 'rotate=90', target]);
    }
}

const realTools = createVideoTools();
const hasRealFfmpeg = await realTools.isAvailable();

test('ffmpeg thật: đo được video xoay và cắt được ảnh bìa đúng chiều hiển thị', { skip: !hasRealFfmpeg && 'máy không có ffmpeg/ffprobe' }, async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'zbr-video-test-'));
    try {
        const landscape = path.join(dir, 'ngang.mp4');
        const portrait = path.join(dir, 'doc.mp4');
        execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=10', '-t', '2', '-pix_fmt', 'yuv420p', landscape]);
        rotateWithoutReencode(landscape, portrait);

        assert.deepEqual(await realTools.probe(landscape), { durationMs: 2000, width: 320, height: 240 });
        assert.deepEqual(await realTools.probe(portrait), { durationMs: 2000, width: 240, height: 320 });

        const thumbnail = path.join(dir, 'doc-thumbnail.jpg');
        await realTools.extractThumbnail(portrait, thumbnail, 2000);
        const size = JSON.parse(
            execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', thumbnail]).toString()
        ).streams[0];
        assert.deepEqual(size, { width: 240, height: 320 });
        assert.ok((await fs.stat(thumbnail)).size > 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});

test('ffmpeg thật: .mov đổi vỏ sang mp4 không mã hoá lại, đo được như mp4', { skip: !hasRealFfmpeg && 'máy không có ffmpeg/ffprobe' }, async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'zbr-video-test-'));
    try {
        const mov = path.join(dir, 'IMG_0421.mov');
        const mp4 = path.join(dir, 'IMG_0421-remux.mp4');
        execFileSync('ffmpeg', [
            '-hide_banner', '-loglevel', 'error', '-y',
            '-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=10',
            '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
            '-t', '2', '-pix_fmt', 'yuv420p', '-c:a', 'aac', mov,
        ]);

        await realTools.remuxToMp4(mov, mp4);

        const probeStreams = (file) =>
            JSON.parse(
                execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,codec_name:format_tags=major_brand', '-of', 'json', file]).toString()
            );
        const source = probeStreams(mov);
        const remuxed = probeStreams(mp4);
        assert.equal(source.format.tags.major_brand.trim(), 'qt');
        assert.match(remuxed.format.tags.major_brand, /^(isom|mp4\d)$/, 'vỏ mp4, không còn là QuickTime');
        assert.deepEqual(
            remuxed.streams.map((stream) => [stream.codec_type, stream.codec_name]),
            source.streams.map((stream) => [stream.codec_type, stream.codec_name]),
            'giữ nguyên luồng hình và tiếng'
        );
        assert.deepEqual(await realTools.probe(mp4), { durationMs: 2000, width: 320, height: 240 });
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
