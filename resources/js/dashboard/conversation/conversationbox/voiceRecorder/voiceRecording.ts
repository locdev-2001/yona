// Bản ghi âm dài hơn thì khó nghe hết và nặng khi gửi; tới mức này máy ghi tự dừng.
export const MAX_VOICE_RECORDING_SECONDS = 300;

// Thứ tự ưu tiên: Opus trong WebM (Chrome, Edge), Opus trong Ogg (Firefox), AAC trong
// mp4 (Safari). Không định dạng nào hỗ trợ thì để trình duyệt tự chọn.
const RECORDING_MIME_CANDIDATES = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/webm',
];

const FILE_EXTENSION_BY_MIME: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/mpeg': 'mp3',
};

const FALLBACK_RECORDING_MIME = 'audio/webm';

export type VoiceRecordingError = 'permission_denied' | 'no_microphone' | 'microphone_busy' | 'unsupported' | 'failed';

export const VOICE_RECORDING_ERROR_KEYS: Record<VoiceRecordingError, string> = {
    permission_denied: 'CONVERSATION.REPLYBOX.VOICE_RECORDER.PERMISSION_DENIED',
    no_microphone: 'CONVERSATION.REPLYBOX.VOICE_RECORDER.NO_MICROPHONE',
    microphone_busy: 'CONVERSATION.REPLYBOX.VOICE_RECORDER.MICROPHONE_BUSY',
    unsupported: 'CONVERSATION.REPLYBOX.VOICE_RECORDER.UNSUPPORTED',
    failed: 'CONVERSATION.REPLYBOX.VOICE_RECORDER.FAILED',
};

const ERROR_BY_DOM_EXCEPTION_NAME: Record<string, VoiceRecordingError> = {
    NotAllowedError: 'permission_denied',
    PermissionDeniedError: 'permission_denied',
    SecurityError: 'permission_denied',
    NotFoundError: 'no_microphone',
    DevicesNotFoundError: 'no_microphone',
    OverconstrainedError: 'no_microphone',
    NotReadableError: 'microphone_busy',
    TrackStartError: 'microphone_busy',
    NotSupportedError: 'unsupported',
};

/** Ghi âm cần MediaRecorder + getUserMedia (chỉ có trên trang HTTPS hoặc localhost). */
export function isVoiceRecordingSupported(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.MediaRecorder === 'function' &&
        typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getUserMedia === 'function'
    );
}

export function pickRecordingMimeType(isTypeSupported: (mimeType: string) => boolean): string | null {
    return RECORDING_MIME_CANDIDATES.find(mimeType => isTypeSupported(mimeType)) ?? null;
}

export function voiceRecordingErrorFrom(error: unknown): VoiceRecordingError {
    const name = error instanceof Error || error instanceof DOMException ? error.name : '';

    return ERROR_BY_DOM_EXCEPTION_NAME[name] ?? 'failed';
}

function baseMimeType(mimeType: string): string {
    return mimeType.split(';')[0].trim().toLowerCase();
}

function timestampForFileName(date: Date): string {
    const pad = (value: number) => String(value).padStart(2, '0');

    return (
        `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
        `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
}

/** Gói các mảnh MediaRecorder thành một tệp đính kèm; loại tệp bỏ phần codecs để máy chủ nhận đúng loại âm thanh. */
export function voiceRecordingFile(chunks: BlobPart[], recordedMimeType: string, recordedAt: Date): File {
    const mimeType = baseMimeType(recordedMimeType || FALLBACK_RECORDING_MIME);
    const extension = FILE_EXTENSION_BY_MIME[mimeType] ?? FILE_EXTENSION_BY_MIME[FALLBACK_RECORDING_MIME];

    return new File(chunks, `voice-message-${timestampForFileName(recordedAt)}.${extension}`, { type: mimeType });
}

export function formatRecordingDuration(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));

    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
