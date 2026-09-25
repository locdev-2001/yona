/**
 * send-video.mjs — gửi video ra Zalo thành video phát được (`chat.video.msg`).
 *
 * `sendMessage({ attachments })` của zca gửi mp4 theo đường tệp, nên người nhận
 * thấy thẻ tệp (`share.file`). `sendVideo` cần URL video và URL ảnh bìa đã nằm
 * trên CDN Zalo, cùng thời lượng và kích thước. Vì vậy phải: ffprobe đo video,
 * ffmpeg cắt một khung làm ảnh bìa, `uploadAttachment` cả hai, rồi `sendVideo`.
 *
 * Bước chuẩn bị nào hỏng (thiếu ffmpeg, không phải mp4, đo/cắt/tải lên lỗi) thì
 * chưa có gì tới khách: rơi về đường gửi tệp cũ với nguyên nội dung. `sendVideo`
 * bị Zalo từ chối cũng rơi về gửi tệp. Lỗi khác của `sendVideo` (mạng, timeout)
 * có thể xảy ra sau khi Zalo đã nhận, nên ném tiếp để Laravel đánh dấu thất bại,
 * tránh khách nhận hai lần (cùng luật với chuyển tiếp gốc).
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { classifyZcaError } from './routes/personal-messages.mjs';

export const SEND_VIDEO_LOG_TAG = '[zalo-bridge:send-video]';

// zca chỉ gửi mp4 theo loại "video" (uploadAttachment.js nhánh `case "mp4"`).
const NATIVE_VIDEO_EXTENSION = '.mp4';
const TOOL_TIMEOUT_MS = 30000;
const THUMBNAIL_MAX_WIDTH = 720;
const THUMBNAIL_SEEK_SECONDS = 1;
const LOG_ERROR_MAX_LENGTH = 160;

function runTool(binary, args) {
    return new Promise((resolve, reject) => {
        execFile(binary, args, { timeout: TOOL_TIMEOUT_MS, maxBuffer: 1024 * 1024 }, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(String(stdout));
        });
    });
}

function positiveNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
}

function rotationOf(stream) {
    const fromSideData = (stream.side_data_list || []).find((entry) => entry && entry.rotation != null)?.rotation;
    return Number(fromSideData ?? stream.tags?.rotate ?? 0) || 0;
}

/**
 * Kết quả `ffprobe -of json` → kích thước HIỂN THỊ (video quay dọc của điện thoại
 * lưu ngang kèm góc xoay) và thời lượng tính bằng ms.
 *
 * @returns {{ durationMs: number, width: number, height: number }}
 */
export function parseProbeOutput(json) {
    const parsed = JSON.parse(json);
    const stream = parsed?.streams?.[0];
    const width = positiveNumber(stream?.width);
    const height = positiveNumber(stream?.height);
    if (!stream || width === null || height === null) {
        throw new Error('probe_no_video_stream');
    }
    const durationSeconds = positiveNumber(stream.duration) ?? positiveNumber(parsed?.format?.duration) ?? 0;
    const quarterTurn = Math.abs(rotationOf(stream)) % 180 === 90;

    return {
        durationMs: Math.round(durationSeconds * 1000),
        width: quarterTurn ? height : width,
        height: quarterTurn ? width : height,
    };
}

/**
 * ffmpeg/ffprobe dò MỘT lần (lần gọi `isAvailable` đầu tiên, thường lúc khởi động);
 * đường dẫn đặt qua env, mặc định tìm trong PATH.
 */
export function createVideoTools({ ffmpegPath = 'ffmpeg', ffprobePath = 'ffprobe', run = runTool } = {}) {
    let availability = null;

    return {
        isAvailable() {
            availability ??= Promise.all([run(ffmpegPath, ['-version']), run(ffprobePath, ['-version'])]).then(
                () => true,
                () => false
            );
            return availability;
        },
        async probe(videoPath) {
            const json = await run(ffprobePath, [
                '-v', 'error',
                '-select_streams', 'v:0',
                '-show_entries', 'stream=width,height,duration:stream_tags=rotate:stream_side_data=rotation:format=duration',
                '-of', 'json',
                videoPath,
            ]);
            return parseProbeOutput(json);
        },
        async extractThumbnail(videoPath, thumbnailPath, durationMs) {
            const seekSeconds = Math.min(THUMBNAIL_SEEK_SECONDS, durationMs / 2000);
            await run(ffmpegPath, [
                '-hide_banner', '-loglevel', 'error', '-y',
                '-ss', seekSeconds.toFixed(3),
                '-i', videoPath,
                '-frames:v', '1',
                '-vf', `scale='min(${THUMBNAIL_MAX_WIDTH},iw)':-2`,
                '-q:v', '3',
                thumbnailPath,
            ]);
            await fs.access(thumbnailPath);
        },
    };
}

class NativeVideoUnavailable extends Error {
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
        throw new NativeVideoUnavailable(stage, error);
    }
}

/** Lỗi zca có thể chứa URL CDN mang token: chỉ giữ tên lỗi + câu đã che URL. */
function loggableError(error) {
    if (!error) {
        return null;
    }
    const message = String(error.message ?? error)
        .replace(/https?:\/\/\S+/gi, '[url]')
        .slice(0, LOG_ERROR_MAX_LENGTH);
    return `${error.name || 'Error'}: ${message}`;
}

function uploadedUrl(uploadResult, pick) {
    const entry = Array.isArray(uploadResult) ? uploadResult[0] : null;
    const url = entry ? pick(entry) : null;
    if (typeof url !== 'string' || url === '') {
        throw new Error('upload_without_url');
    }
    return url;
}

function thumbnailPathFor(videoPath) {
    const stem = path.basename(videoPath, path.extname(videoPath));
    return path.join(path.dirname(videoPath), `${stem}-thumbnail.jpg`);
}

/**
 * @param {{
 *   api: { sendMessage: Function, sendVideo: Function, uploadAttachment: Function },
 *   content: { msg: string, attachments: string[], quote?: object, mentions?: object[] },
 *   threadId: string,
 *   threadType: number,
 *   tools: ReturnType<typeof createVideoTools>,
 *   messageId?: unknown,
 *   warn?: (tag: string, line: string) => void,
 * }} input `content` là đúng nội dung đường gửi tệp sẽ dùng (buildSendMessageContent)
 * @returns {Promise<object>} kết quả `collectSourceIdsFromSendResult` đọc được
 */
export async function sendVideoOrFile({ api, content, threadId, threadType, tools, messageId = null, warn = console.warn }) {
    const videoPath = content.attachments[0];
    const thumbnailPath = thumbnailPathFor(videoPath);
    const logFallback = (stage, error) =>
        warn(
            SEND_VIDEO_LOG_TAG,
            JSON.stringify({ message_id: messageId ?? null, fallback: 'file', stage, error: loggableError(error) })
        );

    try {
        let prepared;
        try {
            prepared = await prepareNativeVideo({ api, videoPath, thumbnailPath, threadId, threadType, tools });
        } catch (error) {
            if (!(error instanceof NativeVideoUnavailable)) {
                throw error;
            }
            logFallback(error.stage, error.cause);
            return await api.sendMessage(content, threadId, threadType);
        }

        // Chú thích, trích dẫn, nhắc tên đi thành một tin chữ riêng TRƯỚC video,
        // đúng như zca vẫn tách khi gửi mp4 dạng tệp.
        const { attachments: _video, ...textContent } = content;
        const textResult = textContent.msg ? await api.sendMessage(textContent, threadId, threadType) : null;

        let videoResult;
        try {
            videoResult = await api.sendVideo(prepared, threadId, threadType);
        } catch (error) {
            if (classifyZcaError(error) !== 'zalo_rejected') {
                throw error;
            }
            logFallback('send_video', error);
            const fileResult = await api.sendMessage({ msg: '', attachments: [videoPath] }, threadId, threadType);
            return { message: textResult?.message ?? null, attachment: fileResult?.attachment ?? [] };
        }

        return { message: textResult?.message ?? null, attachment: [videoResult] };
    } finally {
        await fs.rm(thumbnailPath, { force: true }).catch(() => {});
    }
}

async function prepareNativeVideo({ api, videoPath, thumbnailPath, threadId, threadType, tools }) {
    if (!(await tools.isAvailable())) {
        throw new NativeVideoUnavailable('tools_missing', null);
    }
    if (path.extname(videoPath).toLowerCase() !== NATIVE_VIDEO_EXTENSION) {
        throw new NativeVideoUnavailable('not_mp4', null);
    }
    const { durationMs, width, height } = await prepareStage('probe', () => tools.probe(videoPath));
    await prepareStage('thumbnail', () => tools.extractThumbnail(videoPath, thumbnailPath, durationMs));
    const videoUrl = await prepareStage('upload_video', async () =>
        uploadedUrl(await api.uploadAttachment(videoPath, threadId, threadType), (entry) => entry.fileUrl)
    );
    const thumbnailUrl = await prepareStage('upload_thumbnail', async () =>
        uploadedUrl(
            await api.uploadAttachment(thumbnailPath, threadId, threadType),
            (entry) => entry.normalUrl || entry.hdUrl
        )
    );

    return { videoUrl, thumbnailUrl, duration: durationMs, width, height };
}
