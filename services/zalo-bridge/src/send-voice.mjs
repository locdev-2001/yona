/**
 * send-voice.mjs — gửi bản ghi âm ra Zalo thành tin thoại (`chat.voice`), phát
 * ngay trong khung chat như tin thoại ghi trên app.
 *
 * `sendMessage({ attachments })` gửi âm thanh thành thẻ tệp. `sendVoice` chỉ nhận
 * URL tệp thoại đã nằm trên CDN Zalo, và app Zalo phát tin thoại dạng m4a (AAC).
 * Trình duyệt ghi WebM/Ogg Opus (Chrome, Firefox) hoặc mp4 AAC (Safari), nên phải:
 * ffmpeg đổi sang m4a AAC mono, `uploadAttachment` lấy `fileUrl`, rồi `sendVoice`.
 *
 * Luật rơi về giống video gốc: bước chuẩn bị nào hỏng (tắt bằng env, thiếu ffmpeg,
 * đổi mã / tải lên lỗi) thì chưa có gì tới khách, gửi lại tệp gốc như tệp âm thanh.
 * `sendVoice` bị Zalo từ chối cũng rơi về gửi tệp. Lỗi khác của `sendVoice` (mạng,
 * timeout) có thể xảy ra sau khi Zalo đã nhận, nên ném tiếp để Laravel đánh dấu
 * thất bại, tránh khách nhận hai lần.
 */
import fs from 'node:fs/promises';
import { isDisabledFlag, loggableError, runMediaTool, siblingPath, uploadedUrl } from './media-tools.mjs';
import { classifyZcaError } from './routes/personal-messages.mjs';

export const SEND_VOICE_LOG_TAG = '[zalo-bridge:send-voice]';

const VOICE_FILE_SUFFIX = '-voice.m4a';
const VOICE_CHANNELS = '1';
const VOICE_SAMPLE_RATE = '44100';
const VOICE_BITRATE = '64k';

/**
 * ffmpeg dò MỘT lần (lần gọi `isAvailable` đầu tiên). `enabled: false` là tắt hẳn
 * tin thoại gốc: không dò công cụ, mọi bản ghi âm đi đường tệp.
 */
export function createVoiceTools({ enabled = true, ffmpegPath = 'ffmpeg', run = runMediaTool } = {}) {
    let availability = null;

    return {
        enabled,
        isAvailable() {
            availability ??= enabled
                ? run(ffmpegPath, ['-version']).then(
                      () => true,
                      () => false
                  )
                : Promise.resolve(false);
            return availability;
        },
        async transcodeToM4a(sourcePath, targetPath) {
            await run(ffmpegPath, [
                '-hide_banner', '-loglevel', 'error', '-y',
                '-i', sourcePath,
                '-vn', '-map_metadata', '-1',
                '-ac', VOICE_CHANNELS,
                '-ar', VOICE_SAMPLE_RATE,
                '-c:a', 'aac',
                '-b:a', VOICE_BITRATE,
                '-movflags', '+faststart',
                targetPath,
            ]);
            await fs.access(targetPath);
        },
    };
}

/**
 * `ZALO_NATIVE_VOICE=0` tắt tin thoại gốc (công tắc khi có sự cố, hiệu lực sau khi
 * nạp lại bridge); `FFMPEG_PATH` trỏ công cụ, dùng chung với video gốc.
 */
export function voiceToolsFromEnv(env = process.env, overrides = {}) {
    return createVoiceTools({
        enabled: !isDisabledFlag(env.ZALO_NATIVE_VOICE),
        ffmpegPath: env.FFMPEG_PATH || 'ffmpeg',
        ...overrides,
    });
}

class NativeVoiceUnavailable extends Error {
    constructor(stage, cause) {
        super(stage);
        this.stage = stage;
        this.cause = cause;
    }
}

async function prepareStage(stage, work) {
    try {
        return await work();
    } catch (error) {
        throw new NativeVoiceUnavailable(stage, error);
    }
}

async function prepareNativeVoice({ api, audioPath, voicePath, threadId, threadType, tools }) {
    if (!tools.enabled) {
        throw new NativeVoiceUnavailable('disabled', null);
    }
    if (!(await tools.isAvailable())) {
        throw new NativeVoiceUnavailable('tools_missing', null);
    }
    await prepareStage('transcode', () => tools.transcodeToM4a(audioPath, voicePath));
    const voiceUrl = await prepareStage('upload_voice', async () =>
        uploadedUrl(await api.uploadAttachment(voicePath, threadId, threadType), (entry) => entry.fileUrl)
    );

    return { voiceUrl };
}

/**
 * @param {{
 *   api: { sendMessage: Function, sendVoice: Function, uploadAttachment: Function },
 *   content: { msg: string, attachments: string[], quote?: object, mentions?: object[] },
 *   threadId: string,
 *   threadType: number,
 *   tools: ReturnType<typeof createVoiceTools>,
 *   messageId?: unknown,
 *   warn?: (tag: string, line: string) => void,
 * }} input `content` là đúng nội dung đường gửi tệp sẽ dùng (buildSendMessageContent)
 * @returns {Promise<object>} kết quả `collectSourceIdsFromSendResult` đọc được
 */
export async function sendVoiceOrFile({ api, content, threadId, threadType, tools, messageId = null, warn = console.warn }) {
    const audioPath = content.attachments[0];
    const voicePath = siblingPath(audioPath, VOICE_FILE_SUFFIX);
    const logFallback = (stage, error) =>
        warn(
            SEND_VOICE_LOG_TAG,
            JSON.stringify({ message_id: messageId ?? null, fallback: 'file', stage, error: loggableError(error) })
        );

    try {
        let prepared;
        try {
            prepared = await prepareNativeVoice({ api, audioPath, voicePath, threadId, threadType, tools });
        } catch (error) {
            if (!(error instanceof NativeVoiceUnavailable)) {
                throw error;
            }
            logFallback(error.stage, error.cause);
            return await api.sendMessage(content, threadId, threadType);
        }

        // Tin thoại không mang chú thích: chữ, trích dẫn, nhắc tên đi thành một tin chữ
        // riêng TRƯỚC tin thoại.
        const { attachments: _audio, ...textContent } = content;
        const textResult = textContent.msg ? await api.sendMessage(textContent, threadId, threadType) : null;

        let voiceResult;
        try {
            voiceResult = await api.sendVoice(prepared, threadId, threadType);
        } catch (error) {
            if (classifyZcaError(error) !== 'zalo_rejected') {
                throw error;
            }
            logFallback('send_voice', error);
            const fileResult = await api.sendMessage({ msg: '', attachments: [audioPath] }, threadId, threadType);
            return { message: textResult?.message ?? null, attachment: fileResult?.attachment ?? [] };
        }

        return { message: textResult?.message ?? null, attachment: [voiceResult] };
    } finally {
        await fs.rm(voicePath, { force: true }).catch(() => {});
    }
}
