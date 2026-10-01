import { useEffect, useState } from 'react';
import { ICONS } from 'dashboard/icons';

import NextButton from 'dashboard/components-next/button/Button';

import { t } from '../../../../i18n';

interface VoiceMessagePreviewProps {
    recording: File;
    isSending: boolean;
    onSend: () => void;
    onDiscard: () => void;
}

// Khay của bản ghi âm chờ gửi: nghe lại, gửi, hoặc xoá để ghi lại.
export default function VoiceMessagePreview({ recording, isSending, onSend, onDiscard }: VoiceMessagePreviewProps) {
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(recording);
        setPlaybackUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [recording]);

    return (
        <div
            data-testid="voice-message-preview"
            className="flex flex-wrap items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-n-alpha-2"
        >
            <span className={`${ICONS.microphone} size-4 shrink-0 text-n-slate-11`} aria-hidden="true" />
            {playbackUrl ? (
                <audio
                    controls
                    preload="metadata"
                    src={playbackUrl}
                    aria-label={t('CONVERSATION.REPLYBOX.VOICE_RECORDER.PREVIEW')}
                    className="h-9 min-w-0 flex-1"
                />
            ) : null}
            <div className="flex items-center gap-1 ms-auto">
                <NextButton
                    type="button"
                    label={t('CONVERSATION.REPLYBOX.VOICE_RECORDER.DISCARD')}
                    icon="i-lucide-trash-2"
                    slate
                    ghost
                    sm
                    disabled={isSending}
                    onClick={onDiscard}
                />
                <NextButton
                    type="button"
                    label={t('CONVERSATION.REPLYBOX.VOICE_RECORDER.SEND')}
                    icon={ICONS.send}
                    blue
                    sm
                    isLoading={isSending}
                    disabled={isSending}
                    onClick={onSend}
                />
            </div>
        </div>
    );
}
