import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collectSourceIdsFromSendResult } from './media-fetch.mjs';
import { SEND_VOICE_LOG_TAG, createVoiceTools, sendVoiceOrFile, voiceToolsFromEnv } from './send-voice.mjs';

const THREAD_ID = '9876543210';
const THREAD_TYPE = 0;
const RECORDING_PATH = '/tmp/zbr-test/voice-message-20260929-101500.webm';
const VOICE_PATH = '/tmp/zbr-test/voice-message-20260929-101500-voice.m4a';
const VOICE_CDN_URL = 'https://f21-zpc.zdn.vn/voice/abc.m4a?token=bi-mat';

function zaloRejection(message = 'Zalo từ chối') {
    const error = new Error(message);
    error.name = 'ZaloApiError';
    return error;
}

function fakeApi(overrides = {}) {
    const calls = [];
    const record = (name, impl) => async (...args) => {
        calls.push({ name, args });
        return impl(...args);
    };
    const api = {
        uploadAttachment: record(
            'uploadAttachment',
            overrides.uploadAttachment ?? (() => [{ fileType: 'others', fileUrl: VOICE_CDN_URL, fileId: '1' }])
        ),
        sendVoice: record('sendVoice', overrides.sendVoice ?? (() => ({ msgId: 7001 }))),
        sendMessage: record(
            'sendMessage',
            overrides.sendMessage ??
                ((content) =>
                    content.attachments ? { message: null, attachment: [{ msgId: 8001 }] } : { message: { msgId: 9001 }, attachment: [] })
        ),
    };
    return { api, calls, callsTo: (name) => calls.filter((call) => call.name === name) };
}

function fakeTools({ enabled = true, available = true, transcodeToM4a } = {}) {
    const transcodes = [];
    return {
        transcodes,
        enabled,
        isAvailable: async () => available,
        transcodeToM4a: async (source, target) => {
            transcodes.push([source, target]);
            if (transcodeToM4a) {
                await transcodeToM4a(source, target);
            }
        },
    };
}

async function send({ api, tools = fakeTools(), content = { msg: '', attachments: [RECORDING_PATH] } }) {
    const warnings = [];
    const result = await sendVoiceOrFile({
        api,
        content,
        threadId: THREAD_ID,
        threadType: THREAD_TYPE,
        tools,
        messageId: 42,
        warn: (tag, line) => warnings.push({ tag, entry: JSON.parse(line) }),
    });
    return { result, warnings };
}

test('có ffmpeg: đổi bản ghi sang m4a, tải lên Zalo rồi sendVoice bằng fileUrl, không gửi tệp', async () => {
    const { api, calls, callsTo } = fakeApi();
    const tools = fakeTools();

    const { result, warnings } = await send({ api, tools });

    assert.deepEqual(tools.transcodes, [[RECORDING_PATH, VOICE_PATH]]);
    assert.deepEqual(
        calls.map((call) => call.name),
        ['uploadAttachment', 'sendVoice']
    );
    assert.deepEqual(callsTo('uploadAttachment')[0].args, [VOICE_PATH, THREAD_ID, THREAD_TYPE]);
    assert.deepEqual(callsTo('sendVoice')[0].args, [{ voiceUrl: VOICE_CDN_URL }, THREAD_ID, THREAD_TYPE]);
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['7001']);
    assert.deepEqual(warnings, []);
});

test('có chữ kèm: tin chữ (giữ trích dẫn) đi trước tin thoại, chữ là msgId chính', async () => {
    const { api, calls, callsTo } = fakeApi();
    const quote = { msgId: '8230000000001', cliMsgId: '1788700000001', uidFrom: '88', msgType: 'webchat', ts: '1', content: 'A' };

    const { result } = await send({ api, content: { msg: 'Shop gửi lời nhắn', quote, attachments: [RECORDING_PATH] } });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['uploadAttachment', 'sendMessage', 'sendVoice']
    );
    assert.deepEqual(callsTo('sendMessage')[0].args[0], { msg: 'Shop gửi lời nhắn', quote });
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['9001', '7001']);
});

test('không có ffmpeg: gửi bản ghi gốc dạng tệp âm thanh nguyên nội dung, log bước tools_missing', async () => {
    const { api, calls, callsTo } = fakeApi();
    const content = { msg: 'Chú thích', attachments: [RECORDING_PATH] };

    const { result, warnings } = await send({ api, tools: fakeTools({ available: false }), content });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['sendMessage']
    );
    assert.deepEqual(callsTo('sendMessage')[0].args, [content, THREAD_ID, THREAD_TYPE]);
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['8001']);
    assert.equal(warnings[0].tag, SEND_VOICE_LOG_TAG);
    assert.deepEqual(warnings[0].entry, { message_id: 42, fallback: 'file', stage: 'tools_missing', error: null });
});

test('tắt bằng env: gửi tệp, không đổi mã, log bước disabled', async () => {
    const { api, calls } = fakeApi();
    const tools = fakeTools({ enabled: false });

    const { warnings } = await send({ api, tools });

    assert.deepEqual(tools.transcodes, []);
    assert.deepEqual(
        calls.map((call) => call.name),
        ['sendMessage']
    );
    assert.equal(warnings[0].entry.stage, 'disabled');
});

test('đổi mã lỗi: rơi về gửi tệp gốc, log bước transcode', async () => {
    const { api, calls, callsTo } = fakeApi();
    const tools = fakeTools({
        transcodeToM4a: async () => {
            throw new Error('ffmpeg exited 1');
        },
    });

    const { warnings } = await send({ api, tools });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['sendMessage']
    );
    assert.deepEqual(callsTo('sendMessage')[0].args[0].attachments, [RECORDING_PATH]);
    assert.equal(warnings[0].entry.stage, 'transcode');
    assert.match(warnings[0].entry.error, /ffmpeg exited 1/);
});

test('tải lên không có fileUrl: rơi về gửi tệp gốc, log bước upload_voice', async () => {
    const { api, calls } = fakeApi({ uploadAttachment: () => [{ fileType: 'others' }] });

    const { warnings } = await send({ api });

    assert.deepEqual(
        calls.map((call) => call.name),
        ['uploadAttachment', 'sendMessage']
    );
    assert.equal(warnings[0].entry.stage, 'upload_voice');
});

test('sendVoice bị Zalo từ chối: gửi bản ghi gốc dạng tệp, chữ đã gửi không gửi lại; log che URL', async () => {
    const { api, callsTo } = fakeApi({
        sendVoice: () => {
            throw zaloRejection(`Không đọc được ${VOICE_CDN_URL}`);
        },
    });

    const { result, warnings } = await send({ api, content: { msg: 'Chào', attachments: [RECORDING_PATH] } });

    const sends = callsTo('sendMessage');
    assert.equal(sends.length, 2);
    assert.deepEqual(sends[0].args[0], { msg: 'Chào' });
    assert.deepEqual(sends[1].args[0], { msg: '', attachments: [RECORDING_PATH] });
    assert.deepEqual(collectSourceIdsFromSendResult(result), ['9001', '8001']);
    assert.equal(warnings[0].entry.stage, 'send_voice');
    assert.ok(!warnings[0].entry.error.includes('zdn.vn'), 'log không lộ URL CDN');
});

test('sendVoice lỗi mạng (có thể Zalo đã nhận): ném tiếp, không gửi thêm tệp', async () => {
    const { api, callsTo } = fakeApi({
        sendVoice: () => {
            throw new TypeError('fetch failed');
        },
    });

    await assert.rejects(send({ api }), /fetch failed/);
    assert.equal(callsTo('sendMessage').length, 0);
});

test('createVoiceTools: dò ffmpeg một lần; lỗi dò là không dùng được', async () => {
    let probes = 0;
    const tools = createVoiceTools({
        run: async () => {
            probes += 1;
            throw new Error('ENOENT');
        },
    });

    assert.equal(await tools.isAvailable(), false);
    assert.equal(await tools.isAvailable(), false);
    assert.equal(probes, 1);
});

test('voiceToolsFromEnv: mặc định bật; ZALO_NATIVE_VOICE=0/false/off tắt hẳn, không dò công cụ', async () => {
    let probes = 0;
    const run = async () => {
        probes += 1;
        return 'ffmpeg version test';
    };

    assert.equal(await voiceToolsFromEnv({}, { run }).isAvailable(), true);
    for (const value of ['0', 'false', 'OFF']) {
        const tools = voiceToolsFromEnv({ ZALO_NATIVE_VOICE: value }, { run });
        assert.equal(tools.enabled, false);
        assert.equal(await tools.isAvailable(), false);
    }
    assert.equal(probes, 1);
});

const hasRealFfmpeg = await createVoiceTools().isAvailable();

test('ffmpeg thật: bản ghi WebM Opus đổi thành m4a AAC mono', { skip: !hasRealFfmpeg && 'máy không có ffmpeg' }, async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'zbr-voice-test-'));
    try {
        const recording = path.join(dir, 'voice-message.webm');
        const voice = path.join(dir, 'voice-message-voice.m4a');
        execFileSync('ffmpeg', [
            '-hide_banner', '-loglevel', 'error', '-y',
            '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
            '-t', '1', '-c:a', 'libopus', recording,
        ]);

        await createVoiceTools().transcodeToM4a(recording, voice);

        const probe = JSON.parse(
            execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_name,channels:format=format_name', '-of', 'json', voice]).toString()
        );
        assert.deepEqual(probe.streams, [{ codec_name: 'aac', channels: 1 }]);
        assert.match(probe.format.format_name, /m4a|mp4/);
        assert.ok((await fs.stat(voice)).size > 0);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
