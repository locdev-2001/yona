import { useCallback, useEffect, useRef, useState } from 'react';

import {
    MAX_VOICE_RECORDING_SECONDS,
    isVoiceRecordingSupported,
    pickRecordingMimeType,
    voiceRecordingErrorFrom,
    voiceRecordingFile,
} from './voiceRecording';
import type { VoiceRecordingError } from './voiceRecording';

export type VoiceRecorderStatus = 'idle' | 'requesting' | 'recording';

export interface VoiceRecording {
    file: File;
    durationSeconds: number;
    reachedMaxDuration: boolean;
}

interface VoiceRecorderOptions {
    onRecorded: (recording: VoiceRecording) => void;
    onError: (error: VoiceRecordingError) => void;
    maxSeconds?: number;
}

interface ActiveRecording {
    recorder: MediaRecorder;
    stream: MediaStream;
    chunks: Blob[];
    startedAt: number;
    discard: boolean;
    reachedMaxDuration: boolean;
    stopRequested: boolean;
}

const ELAPSED_TICK_MS = 250;

function stopStream(stream: MediaStream): void {
    stream.getTracks().forEach(track => track.stop());
}

/**
 * Máy ghi âm của ô soạn: xin quyền micro, ghi, dừng (trả tệp) hoặc huỷ (bỏ bản ghi).
 * Micro luôn được nhả khi dừng, huỷ, lỗi hay khi component bị gỡ.
 */
export function useVoiceRecorder({ onRecorded, onError, maxSeconds = MAX_VOICE_RECORDING_SECONDS }: VoiceRecorderOptions) {
    const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const activeRef = useRef<ActiveRecording | null>(null);
    // Huỷ khi đang chờ quyền: lượt xin quyền trả về sau thì phải nhả micro ngay.
    const pendingRequestRef = useRef(0);
    const requestSequenceRef = useRef(0);
    const callbacksRef = useRef({ onRecorded, onError });
    callbacksRef.current = { onRecorded, onError };

    const reset = useCallback(() => {
        activeRef.current = null;
        setStatus('idle');
        setElapsedSeconds(0);
    }, []);

    const finish = useCallback(
        (active: ActiveRecording) => {
            stopStream(active.stream);
            const durationSeconds = (performance.now() - active.startedAt) / 1000;
            reset();
            if (active.discard) return;

            const file = voiceRecordingFile(active.chunks, active.recorder.mimeType, new Date());
            if (file.size === 0) {
                callbacksRef.current.onError('failed');
                return;
            }
            callbacksRef.current.onRecorded({ file, durationSeconds, reachedMaxDuration: active.reachedMaxDuration });
        },
        [reset],
    );

    const stopActive = useCallback((discard: boolean, reachedMaxDuration = false) => {
        const active = activeRef.current;
        if (!active || active.stopRequested) return;
        active.stopRequested = true;
        active.discard = discard;
        active.reachedMaxDuration = reachedMaxDuration;
        if (active.recorder.state === 'inactive') {
            finish(active);
            return;
        }
        active.recorder.stop();
    }, [finish]);

    const start = useCallback(async () => {
        if (activeRef.current || pendingRequestRef.current !== 0) return;
        if (!isVoiceRecordingSupported()) {
            callbacksRef.current.onError('unsupported');
            return;
        }

        requestSequenceRef.current += 1;
        const requestId = requestSequenceRef.current;
        pendingRequestRef.current = requestId;
        setStatus('requesting');

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (error) {
            if (pendingRequestRef.current === requestId) {
                pendingRequestRef.current = 0;
                reset();
                callbacksRef.current.onError(voiceRecordingErrorFrom(error));
            }
            return;
        }

        if (pendingRequestRef.current !== requestId) {
            stopStream(stream);
            return;
        }
        pendingRequestRef.current = 0;

        let recorder: MediaRecorder;
        try {
            const mimeType = pickRecordingMimeType(type => MediaRecorder.isTypeSupported(type));
            recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        } catch (error) {
            stopStream(stream);
            reset();
            callbacksRef.current.onError(voiceRecordingErrorFrom(error));
            return;
        }

        const active: ActiveRecording = {
            recorder,
            stream,
            chunks: [],
            startedAt: performance.now(),
            discard: false,
            reachedMaxDuration: false,
            stopRequested: false,
        };
        recorder.ondataavailable = event => {
            if (event.data.size > 0) active.chunks.push(event.data);
        };
        recorder.onstop = () => finish(active);
        recorder.onerror = () => {
            active.discard = true;
            stopStream(stream);
            reset();
            callbacksRef.current.onError('failed');
        };

        activeRef.current = active;
        recorder.start();
        setElapsedSeconds(0);
        setStatus('recording');
    }, [finish, reset]);

    const stop = useCallback(() => stopActive(false), [stopActive]);

    const cancel = useCallback(() => {
        if (pendingRequestRef.current !== 0) {
            pendingRequestRef.current = 0;
            reset();
            return;
        }
        stopActive(true);
    }, [reset, stopActive]);

    useEffect(() => {
        if (status !== 'recording') return undefined;

        const timer = window.setInterval(() => {
            const active = activeRef.current;
            if (!active) return;
            const elapsed = (performance.now() - active.startedAt) / 1000;
            setElapsedSeconds(elapsed);
            if (elapsed >= maxSeconds) stopActive(false, true);
        }, ELAPSED_TICK_MS);

        return () => window.clearInterval(timer);
    }, [status, maxSeconds, stopActive]);

    useEffect(
        () => () => {
            pendingRequestRef.current = 0;
            const active = activeRef.current;
            if (!active) return;
            active.discard = true;
            active.recorder.onstop = null;
            if (active.recorder.state !== 'inactive') active.recorder.stop();
            stopStream(active.stream);
        },
        [],
    );

    return { status, elapsedSeconds, maxSeconds, start, stop, cancel };
}
