/**
 * media-tools.mjs — phần chung của các đường gửi media gốc cần ffmpeg (video, tin thoại):
 * chạy công cụ ngoài có timeout, đọc cờ tắt từ env, che URL trong log lỗi, lấy URL
 * CDN từ kết quả `uploadAttachment` của zca.
 */
import { execFile } from 'node:child_process';
import path from 'node:path';

const TOOL_TIMEOUT_MS = 30000;
const DISABLED_FLAG_VALUES = new Set(['0', 'false', 'off', 'no']);
const LOG_ERROR_MAX_LENGTH = 160;

export function runMediaTool(binary, args) {
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

export function isDisabledFlag(value) {
    return DISABLED_FLAG_VALUES.has(String(value ?? '').trim().toLowerCase());
}

/** Lỗi zca có thể chứa URL CDN mang token: chỉ giữ tên lỗi + câu đã che URL. */
export function loggableError(error) {
    if (!error) {
        return null;
    }
    const message = String(error.message ?? error)
        .replace(/https?:\/\/\S+/gi, '[url]')
        .slice(0, LOG_ERROR_MAX_LENGTH);
    return `${error.name || 'Error'}: ${message}`;
}

export function uploadedUrl(uploadResult, pick) {
    const entry = Array.isArray(uploadResult) ? uploadResult[0] : null;
    const url = entry ? pick(entry) : null;
    if (typeof url !== 'string' || url === '') {
        throw new Error('upload_without_url');
    }
    return url;
}

export function siblingPath(sourcePath, suffix) {
    const stem = path.basename(sourcePath, path.extname(sourcePath));
    return path.join(path.dirname(sourcePath), `${stem}${suffix}`);
}
