import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import EmojiIconPicker from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import type { PickerSelection } from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import { ALLOWED_FILE_TYPES } from 'shared/constants/messages';
import { t } from '../../../i18n';

// Port từ dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue.
// Đính kèm: nút paperclip mở file picker (input file ẩn thay vue-upload
// FileUpload) → onFileUpload từng file; upload thật + drag-drop (B9).
// Bỏ ở B3: AudioRecorder thật (B9 — nút mic giữ chỗ theo cờ voice_recorder +
// showFileUpload API inbox, ẩn khi private note), VideoCallButton
// (integrations), WhatsApp/Content templates (F5), quoted reply + insert
// article (email/help center). EmojiIconPicker dùng bản portal của A6.
interface ReplyBottomPanelProps {
    isNote: boolean;
    isOnPrivateNote: boolean;
    isEditorDisabled: boolean;
    showAudioRecorder: boolean;
    enableMultipleFileUpload?: boolean;
    isSendDisabled: boolean;
    sendButtonText: string;
    sendWithSignature: boolean;
    onSend: () => void;
    onFileUpload: (file: File) => void;
    onToggleSignature: () => void;
    onSelectEmoji: (emoji: string) => void;
}

export default function ReplyBottomPanel({
    isNote,
    isOnPrivateNote,
    isEditorDisabled,
    showAudioRecorder,
    enableMultipleFileUpload = true,
    isSendDisabled,
    sendButtonText,
    sendWithSignature,
    onSend,
    onFileUpload,
    onToggleSignature,
    onSelectEmoji,
}: ReplyBottomPanelProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiButtonRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleFilesChosen = (event: ChangeEvent<HTMLInputElement>) => {
        Array.from(event.target.files ?? []).forEach(onFileUpload);
        event.target.value = '';
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
                    <>
                        <input
                            ref={fileInputRef}
                            type="file"
                            hidden
                            accept={ALLOWED_FILE_TYPES}
                            multiple={enableMultipleFileUpload}
                            onChange={handleFilesChosen}
                        />
                        <NextButton
                            title={t('CONVERSATION.REPLYBOX.TIP_ATTACH_ICON')}
                            icon="i-ph-paperclip"
                            slate
                            faded
                            sm
                            onClick={() => fileInputRef.current?.click()}
                        />
                    </>
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
