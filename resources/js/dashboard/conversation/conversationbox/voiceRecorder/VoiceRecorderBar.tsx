import NextButton from 'dashboard/components-next/button/Button';
import { ICONS } from 'dashboard/icons';

import { t } from '../../../../i18n';
import type { VoiceRecorderStatus } from './useVoiceRecorder';
import { formatRecordingDuration } from './voiceRecording';

interface VoiceRecorderBarProps {
    status: Exclude<VoiceRecorderStatus, 'idle'>;
    elapsedSeconds: number;
    maxSeconds: number;
    onStop: () => void;
    onCancel: () => void;
}

// Thanh của máy ghi âm khi đang chờ quyền micro hoặc đang ghi: thời lượng, dừng, huỷ.
export default function VoiceRecorderBar({ status, elapsedSeconds, maxSeconds, onStop, onCancel }: VoiceRecorderBarProps) {
    const isRecording = status === 'recording';

    return (
        <div
            data-testid="voice-recorder-bar"
            className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-n-alpha-2"
        >
            <span
                aria-hidden="true"
                className={`size-2.5 shrink-0 rounded-full ${isRecording ? 'bg-n-ruby-9 animate-pulse' : 'bg-n-slate-8'}`}
            />
            <span role="status" aria-live="polite" className="text-sm text-n-slate-12">
                {isRecording
                    ? t('CONVERSATION.REPLYBOX.VOICE_RECORDER.RECORDING')
                    : t('CONVERSATION.REPLYBOX.VOICE_RECORDER.WAITING_FOR_PERMISSION')}
            </span>
            {isRecording ? (
                <span className="text-sm tabular-nums text-n-slate-11">
                    {formatRecordingDuration(elapsedSeconds)} / {formatRecordingDuration(maxSeconds)}
                </span>
            ) : null}
            <div className="flex items-center gap-1 ms-auto">
                <NextButton
                    type="button"
                    label={t('CONVERSATION.REPLYBOX.VOICE_RECORDER.CANCEL')}
                    slate
                    ghost
                    sm
                    onClick={onCancel}
                />
                <NextButton
                    type="button"
                    label={t('CONVERSATION.REPLYBOX.STOP_AUDIO_RECORDING')}
                    icon={ICONS.stopRecording}
                    ruby
                    sm
                    disabled={!isRecording}
                    onClick={onStop}
                />
            </div>
        </div>
    );
}
