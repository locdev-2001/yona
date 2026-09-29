import { describe, expect, it } from 'vitest';

import {
    formatRecordingDuration,
    pickRecordingMimeType,
    voiceRecordingErrorFrom,
    voiceRecordingFile,
} from './voiceRecording';

const RECORDED_AT = new Date(2026, 8, 29, 10, 15, 3);

describe('voiceRecording', () => {
    it('chọn Opus WebM trước, rồi Ogg (Firefox), rồi mp4 AAC (Safari); không có gì thì để trình duyệt chọn', () => {
        expect(pickRecordingMimeType(() => true)).toBe('audio/webm;codecs=opus');
        expect(pickRecordingMimeType(type => type.startsWith('audio/ogg'))).toBe('audio/ogg;codecs=opus');
        expect(pickRecordingMimeType(type => type === 'audio/mp4')).toBe('audio/mp4');
        expect(pickRecordingMimeType(() => false)).toBeNull();
    });

    it('tệp bản ghi mang loại âm thanh không kèm codecs và đuôi theo định dạng thật', () => {
        const webm = voiceRecordingFile([new Blob(['a'])], 'audio/webm;codecs=opus', RECORDED_AT);
        const safari = voiceRecordingFile([new Blob(['a'])], 'audio/mp4', RECORDED_AT);
        const unknown = voiceRecordingFile([new Blob(['a'])], '', RECORDED_AT);

        expect(webm.name).toBe('voice-message-20260929-101503.webm');
        expect(webm.type).toBe('audio/webm');
        expect(safari.name).toBe('voice-message-20260929-101503.m4a');
        expect(safari.type).toBe('audio/mp4');
        expect(unknown.type).toBe('audio/webm');
        expect(unknown.name.endsWith('.webm')).toBe(true);
    });

    it('lỗi của getUserMedia thành lý do dễ hiểu', () => {
        expect(voiceRecordingErrorFrom(new DOMException('denied', 'NotAllowedError'))).toBe('permission_denied');
        expect(voiceRecordingErrorFrom(new DOMException('none', 'NotFoundError'))).toBe('no_microphone');
        expect(voiceRecordingErrorFrom(new DOMException('busy', 'NotReadableError'))).toBe('microphone_busy');
        expect(voiceRecordingErrorFrom(new DOMException('mime', 'NotSupportedError'))).toBe('unsupported');
        expect(voiceRecordingErrorFrom(new Error('boom'))).toBe('failed');
        expect(voiceRecordingErrorFrom('boom')).toBe('failed');
    });

    it('thời lượng hiển thị mm:ss', () => {
        expect(formatRecordingDuration(0)).toBe('00:00');
        expect(formatRecordingDuration(65.7)).toBe('01:05');
        expect(formatRecordingDuration(300)).toBe('05:00');
        expect(formatRecordingDuration(-3)).toBe('00:00');
    });
});
