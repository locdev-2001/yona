import { useRef, useState } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import EmojiIconPicker from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import type { PickerSelection } from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import { t } from '../../../i18n';

// Port từ dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue.
// Bỏ ở B3: FileUpload thật (B9 — nút paperclip giữ chỗ), AudioRecorder thật (B9 —
// nút mic giữ chỗ, hiện theo cờ account voice_recorder + showFileUpload API inbox,
// ẩn khi private note), VideoCallButton (integrations), WhatsApp/Content
// templates (F5), quoted reply + insert article (email/help center), drag-drop.
// EmojiIconPicker dùng bản portal của A6 thay .emoji-dialog absolute của gốc.
interface ReplyBottomPanelProps {
    isNote: boolean;
    isOnPrivateNote: boolean;
    isEditorDisabled: boolean;
    showAudioRecorder: boolean;
    isSendDisabled: boolean;
    sendButtonText: string;
    sendWithSignature: boolean;
    onSend: () => void;
    onToggleSignature: () => void;
    onSelectEmoji: (emoji: string) => void;
}

export default function ReplyBottomPanel({
    isNote,
    isOnPrivateNote,
    isEditorDisabled,
    showAudioRecorder,
    isSendDisabled,
    sendButtonText,
    sendWithSignature,
    onSend,
    onToggleSignature,
    onSelectEmoji,
}: ReplyBottomPanelProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiButtonRef = useRef<HTMLDivElement>(null);

    const showAttachButton = !isEditorDisabled;
    const showAudioRecorderButton = !isEditorDisabled && showAudioRecorder;
    const showMessageSignatureButton = !isEditorDisabled && !isOnPrivateNote;

    const signatureToggleTooltip = sendWithSignature
        ? t('CONVERSATION.FOOTER.DISABLE_SIGN_TOOLTIP')
        : t('CONVERSATION.FOOTER.ENABLE_SIGN_TOOLTIP');

    const handleEmojiSelect = (selection: PickerSelection) => {
        if (selection.type === 'emoji') {
            onSelectEmoji(selection.value);
        }
        setShowEmojiPicker(false);
    };

    return (
        <div className={`flex justify-between p-3 ${isNote ? 'is-note-mode' : ''}`}>
            <div className="items-center flex gap-2">
                {!isEditorDisabled ? (
                    <div ref={emojiButtonRef} className="flex">
                        <NextButton
                            title={t('CONVERSATION.REPLYBOX.TIP_EMOJI_ICON')}
                            icon="i-ph-smiley-sticker"
                            slate
                            faded
                            sm
                            onClick={() => setShowEmojiPicker(open => !open)}
                        />
                    </div>
                ) : null}
                {showAttachButton ? (
                    <NextButton
                        title={t('CONVERSATION.REPLYBOX.TIP_ATTACH_ICON')}
                        icon="i-ph-paperclip"
                        slate
                        faded
                        sm
                    />
                ) : null}
                {showAudioRecorderButton ? (
                    <NextButton
                        title={t('CONVERSATION.REPLYBOX.TIP_AUDIORECORDER_ICON')}
                        icon="i-ph-microphone"
                        slate
                        faded
                        sm
                    />
                ) : null}
                {showMessageSignatureButton ? (
                    <NextButton
                        title={signatureToggleTooltip}
                        icon="i-ph-signature"
                        slate
                        faded
                        sm
                        onClick={onToggleSignature}
                    />
                ) : null}
            </div>
            <div className="flex">
                <NextButton
                    label={sendButtonText}
                    type="submit"
                    sm
                    color={isNote ? 'amber' : 'blue'}
                    disabled={isSendDisabled}
                    className="flex-shrink-0"
                    onClick={onSend}
                />
            </div>
            {showEmojiPicker ? (
                <EmojiIconPicker
                    mode="emoji"
                    anchorRef={emojiButtonRef}
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowEmojiPicker(false)}
                />
            ) : null}
        </div>
    );
}
