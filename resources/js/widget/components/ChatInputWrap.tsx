import { useEffect, useRef, useState } from 'react';
import { createTypingIndicator } from '@chatwoot/utils';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import Spinner from 'shared/components/Spinner';
import { checkFileSizeLimit, DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE } from 'shared/helpers/FileHelper';
import { ALLOWED_FILE_TYPES } from 'shared/constants/messages';

import { TYPING_INDICATOR_IDLE_TIME, WIDGET_BUS_EVENTS } from '../helpers/constants';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import EmojiPicker from './EmojiPicker';
import type { AttachmentPayload } from '../types';

// Port từ widget/components/ChatInputWrap.vue + ChatAttachment.vue +
// ChatSendButton.vue + shared/components/ResizableTextArea.vue (phần widget dùng).
// Bản gốc upload qua ActiveStorage DirectUpload khi bật direct uploads; ở đây tệp
// đi thẳng trong multipart của POST /messages (backend gộp 2 bước — c2-notes-be §DirectUploads).

interface ChatInputWrapProps {
    onSendMessage: (content: string) => void;
    onSendAttachment: (attachment: AttachmentPayload) => void;
}

export default function ChatInputWrap({ onSendMessage, onSendAttachment }: ChatInputWrapProps) {
    const widgetColor = useWidgetState(state => state.appConfig.widgetColor);
    const isWidgetOpen = useWidgetState(state => state.appConfig.isWidgetOpen);
    const shouldShowFilePicker = useWidgetState(state => state.appConfig.enableFileUpload);
    const shouldShowEmojiPicker = useWidgetState(state => state.appConfig.enableEmojiPicker);
    const enabledFeatures = useWidgetState(state => state.channelConfig?.enabledFeatures);
    const maximumFileUploadSize = useWidgetState(
        state => state.globalConfig.MAXIMUM_FILE_UPLOAD_SIZE ?? DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE,
    );

    const [userInput, setUserInput] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isFocused, setFocused] = useState(false);
    const [isUploading, setUploading] = useState(false);

    const textarea = useRef<HTMLTextAreaElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const emojiWrap = useRef<HTMLDivElement>(null);

    const hasAttachmentsEnabled = Boolean(enabledFeatures?.includes('attachments'));
    const hasEmojiPickerEnabled = Boolean(enabledFeatures?.includes('emoji_picker'));
    // useAttachments: cờ của SDK thắng cấu hình inbox khi được đặt tường minh.
    const canHandleAttachments = shouldShowFilePicker !== undefined ? shouldShowFilePicker : hasAttachmentsEnabled;

    const showAttachment = canHandleAttachments && userInput.length === 0;
    const showSendButton = userInput.length > 0;

    const typingIndicator = useRef(
        createTypingIndicator(
            () => void widgetStore.toggleUserTyping('on'),
            () => void widgetStore.toggleUserTyping('off'),
            TYPING_INDICATOR_IDLE_TIME,
        ),
    );

    const focusInput = () => textarea.current?.focus();

    // ResizableTextArea gốc focus ngay khi mount nếu ô đang rỗng; ChatInputWrap
    // focus thêm mỗi lần widget được mở.
    useEffect(() => {
        focusInput();
    }, []);

    useEffect(() => {
        if (isWidgetOpen) focusInput();
    }, [isWidgetOpen]);

    // ResizableTextArea: chiều cao bám nội dung (min 2rem như prop rows=1).
    useEffect(() => {
        const element = textarea.current;
        if (!element) return;
        element.style.height = 'auto';
        element.style.height = userInput ? `${element.scrollHeight}px` : '';
    }, [userInput]);

    const handleButtonClick = () => {
        if (userInput && userInput.trim()) {
            onSendMessage(userInput);
        }
        setUserInput('');
        focusInput();
    };

    // Bản gốc bắt keypress ở document để Enter gửi tin dù con trỏ ở đâu.
    useEffect(() => {
        const handleEnterKeyPress = (event: KeyboardEvent) => {
            if (event.keyCode === 13 && !event.shiftKey) {
                event.preventDefault();
                handleButtonClick();
            }
        };
        document.addEventListener('keypress', handleEnterKeyPress);
        return () => document.removeEventListener('keypress', handleEnterKeyPress);
    });

    // Dán ảnh từ clipboard → gửi như tệp đính kèm.
    useEffect(() => {
        const handleClipboardPaste = (event: ClipboardEvent) => {
            if (!canHandleAttachments) return;
            Array.from(event.clipboardData?.items ?? []).forEach(item => {
                if (item.kind !== 'file') return;
                event.preventDefault();
                const file = item.getAsFile();
                if (file) void uploadFile(file);
            });
        };
        document.addEventListener('paste', handleClipboardPaste);
        return () => document.removeEventListener('paste', handleClipboardPaste);
    });

    const uploadFile = async (file: File) => {
        setUploading(true);
        try {
            if (checkFileSizeLimit(file, maximumFileUploadSize)) {
                await onSendAttachment({
                    file,
                    thumbUrl: window.URL.createObjectURL(file),
                    fileType: file.type.includes('image') ? 'image' : 'file',
                });
            } else {
                widgetStore.showBanner({
                    message: t('FILE_SIZE_LIMIT', { MAXIMUM_FILE_UPLOAD_SIZE: maximumFileUploadSize }),
                    type: 'error',
                });
            }
        } finally {
            setUploading(false);
        }
    };

    const hideEmojiPicker = () => setShowEmojiPicker(false);

    useEffect(() => {
        if (!showEmojiPicker) return undefined;
        const onClickAway = (event: globalThis.MouseEvent) => {
            if (!emojiWrap.current?.contains(event.target as Node)) hideEmojiPicker();
        };
        document.addEventListener('click', onClickAway);
        return () => document.removeEventListener('click', onClickAway);
    }, [showEmojiPicker]);

    return (
        <div
            className={`items-center flex ltr:pl-3 rtl:pr-3 ltr:pr-2 rtl:pl-2 rounded-[7px] transition-all duration-200 bg-n-background !shadow-[0_0_0_1px,0_0_2px_3px] shadow-sm ${
                isFocused ? '!shadow-[var(--widget-color,#2781f6)]' : '!shadow-n-strong dark:!shadow-n-strong'
            }`}
            onKeyDown={event => {
                if (event.key === 'Escape') hideEmojiPicker();
            }}
        >
            <textarea
                id="chat-input"
                ref={textarea}
                rows={1}
                value={userInput}
                aria-label={t('CHAT_PLACEHOLDER')}
                placeholder={t('CHAT_PLACEHOLDER')}
                className="user-message-input reset-base"
                onChange={event => setUserInput(event.target.value)}
                onKeyUp={() => typingIndicator.current.start()}
                onFocus={() => setFocused(true)}
                onBlur={() => {
                    typingIndicator.current.stop();
                    setFocused(false);
                }}
            />
            <div className="relative flex items-center ltr:pl-2 rtl:pr-2" ref={emojiWrap}>
                {showAttachment ? (
                    <>
                        <button
                            type="button"
                            className="min-h-8 min-w-8 flex items-center justify-center text-n-slate-12"
                            onClick={() => fileInput.current?.click()}
                        >
                            {isUploading ? <Spinner size="small" /> : <FluentIcon icon="attach" />}
                        </button>
                        {/* reset-base: né rule `input:not(.reset-base)` của widget.scss — nó ép display:block. */}
                        <input
                            ref={fileInput}
                            type="file"
                            accept={ALLOWED_FILE_TYPES}
                            className="reset-base hidden"
                            onChange={event => {
                                const file = event.target.files?.[0];
                                if (file) void uploadFile(file);
                                event.target.value = '';
                            }}
                        />
                    </>
                ) : null}
                {shouldShowEmojiPicker && hasEmojiPickerEnabled ? (
                    <button
                        type="button"
                        className="flex items-center justify-center min-h-8 min-w-8"
                        aria-label={t('EMOJI.ARIA_LABEL')}
                        onClick={() => setShowEmojiPicker(open => !open)}
                    >
                        <FluentIcon
                            icon="emoji"
                            className={`transition-all duration-150 ${
                                showEmojiPicker ? 'text-n-brand' : 'text-n-slate-12'
                            }`}
                        />
                    </button>
                ) : null}
                {shouldShowEmojiPicker && showEmojiPicker ? (
                    <EmojiPicker
                        className="!bottom-full end-0 mb-2 max-w-[calc(100vw-3rem)]"
                        onSelect={emoji => setUserInput(current => `${current}${emoji} `)}
                    />
                ) : null}
                {showSendButton ? (
                    <button
                        type="submit"
                        className="min-h-8 min-w-8 flex items-center justify-center ml-1"
                        style={{ color: widgetColor }}
                        onClick={handleButtonClick}
                    >
                        <FluentIcon icon="send" />
                    </button>
                ) : null}
            </div>
        </div>
    );
}
