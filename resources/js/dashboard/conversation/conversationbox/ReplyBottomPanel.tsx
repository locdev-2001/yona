import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import NextButton from 'dashboard/components-next/button/Button';
import EmojiIconPicker from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import type { PickerSelection } from 'dashboard/components-next/emoji-icon-picker/EmojiIconPicker';
import Popover from 'dashboard/components-next/popover/Popover';
import StickerPicker from 'dashboard/components-next/sticker-picker/StickerPicker';
import SendCardMenu, { type SendCardTarget } from 'dashboard/conversation/composer/SendCardMenu/SendCardMenu';
import type { StickerBrowseParams, StickerBrowseResult, StickerItem } from 'dashboard/conversation/stickerApi';
import { ALLOWED_FILE_TYPES } from 'shared/constants/messages';
import { t } from '../../../i18n';

// Port từ dashboard/components/widgets/WootWriter/ReplyBottomPanel.vue.
// Đính kèm: nút paperclip mở file picker (input file ẩn thay vue-upload
// FileUpload) → onFileUpload từng file; upload thật + drag-drop (B9).
// Bỏ ở B3: AudioRecorder thật (B9 — nút mic giữ chỗ theo cờ voice_recorder +
// showFileUpload API inbox, ẩn khi private note), VideoCallButton
// (integrations), WhatsApp/Content templates (F5), quoted reply + insert
// article (email/help center). EmojiIconPicker dùng bản portal của A6.
// Khung soạn tự quyết nguồn dữ liệu và việc gửi; panel chỉ vẽ nút + bảng chọn.
export interface ReplyStickerPicker {
    loadStickers: (params: StickerBrowseParams) => Promise<StickerBrowseResult>;
    onSelect: (sticker: StickerItem) => void;
}

interface ReplyBottomPanelProps {
    isNote: boolean;
    isOnPrivateNote: boolean;
    isEditorDisabled: boolean;
    showAudioRecorder: boolean;
    enableMultipleFileUpload?: boolean;
    isSendDisabled: boolean;
    sendButtonText: string;
    sendWithSignature: boolean;
    showQuotedReplyToggle?: boolean;
    quotedReplyEnabled?: boolean;
    onToggleQuotedReply?: () => void;
    onSend: () => void;
    onFileUpload: (file: File) => void;
    onToggleSignature: () => void;
    onSelectEmoji: (emoji: string) => void;
    // null = kênh không gửi được sticker hoặc đang ở Lưu ý riêng: không có nút.
    stickerPicker?: ReplyStickerPicker | null;
    // null = đang ở Lưu ý riêng: thẻ chỉ gửi cho khách.
    sendCard?: SendCardTarget | null;
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
    showQuotedReplyToggle = false,
    quotedReplyEnabled = false,
    onToggleQuotedReply,
    onSend,
    onFileUpload,
    onToggleSignature,
    onSelectEmoji,
    stickerPicker = null,
    sendCard = null,
}: ReplyBottomPanelProps) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiButtonRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const showAttachButton = !isEditorDisabled;
    const showAudioRecorderButton = !isEditorDisabled && showAudioRecorder;
    const showMessageSignatureButton = !isEditorDisabled && !isOnPrivateNote;

    const quotedReplyToggleTooltip = quotedReplyEnabled
        ? t('CONVERSATION.REPLYBOX.QUOTED_REPLY.DISABLE_TOOLTIP')
        : t('CONVERSATION.REPLYBOX.QUOTED_REPLY.ENABLE_TOOLTIP');

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
                            icon="i-ph-smiley"
                            slate
                            faded
                            sm
                            onClick={() => setShowEmojiPicker(open => !open)}
                        />
                    </div>
                ) : null}
                {stickerPicker && !isEditorDisabled ? (
                    <Popover
                        align="start"
                        trigger={() => (
                            <NextButton
                                type="button"
                                title={t('CONVERSATION.REPLYBOX.TIP_STICKER_ICON')}
                                icon="i-ph-sticker"
                                slate
                                faded
                                sm
                            />
                        )}
                        content={({ hide }) => (
                            <StickerPicker
                                loadStickers={stickerPicker.loadStickers}
                                onSelect={sticker => {
                                    hide();
                                    stickerPicker.onSelect(sticker);
                                }}
                            />
                        )}
                    />
                ) : null}
                {sendCard && !isEditorDisabled ? <SendCardMenu {...sendCard} /> : null}
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
                {showQuotedReplyToggle ? (
                    <NextButton
                        title={quotedReplyToggleTooltip}
                        icon="i-ph-quotes"
                        variant={quotedReplyEnabled ? 'solid' : 'faded'}
                        color="slate"
                        sm
                        aria-pressed={quotedReplyEnabled}
                        onClick={onToggleQuotedReply}
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
