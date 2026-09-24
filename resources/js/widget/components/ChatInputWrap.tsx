import { useEffect, useRef, useState } from 'react';
import { createTypingIndicator } from '@chatwoot/utils';

import FluentIcon from 'shared/components/FluentIcon/FluentIcon';
import { checkFileSizeLimit, DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE } from 'shared/helpers/FileHelper';
import { ALLOWED_FILE_TYPES } from 'shared/constants/messages';

import { TYPING_INDICATOR_IDLE_TIME } from '../helpers/constants';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import AttachMenu from './composer/AttachMenu';
import AttachmentTray from './composer/AttachmentTray';
import StickerPanel from './composer/StickerPanel';
import { readComposerDraft, writeComposerDraft } from './composer/composerStorage';
import type { WidgetSticker } from '../types';

type ComposerPanel = 'attach-menu' | 'stickers' | null;

interface ChatInputWrapProps {
    onSendMessage: (content: string) => void | Promise<void>;
    onSendFiles: (files: File[], caption: string) => void | Promise<void>;
    onSendSticker: (sticker: WidgetSticker) => void | Promise<void>;
}

const ACTION_BUTTON_CLASS =
    'flex flex-shrink-0 items-center justify-center rounded-full size-11 text-[var(--yona-chat-ink-soft)] hover:text-[var(--yona-chat-ink)]';

// Ô nhập dạng viên thuốc với ba hành động: "+" (ảnh/tệp), sticker/emoji, gửi.
// Tệp chọn vào khay trước, gửi thành MỘT tin kèm chú thích.
export default function ChatInputWrap({ onSendMessage, onSendFiles, onSendSticker }: ChatInputWrapProps) {
    const isWidgetOpen = useWidgetState(state => state.appConfig.isWidgetOpen);
    const shouldShowFilePicker = useWidgetState(state => state.appConfig.enableFileUpload);
    const shouldShowEmojiPicker = useWidgetState(state => state.appConfig.enableEmojiPicker);
    const enabledFeatures = useWidgetState(state => state.channelConfig?.enabledFeatures);
    const stickers = useWidgetState(state => state.messagingPolicy.stickers);
    const maximumFileUploadSize = useWidgetState(
        state => state.globalConfig.MAXIMUM_FILE_UPLOAD_SIZE ?? DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE,
    );

    const [userInput, setUserInput] = useState(readComposerDraft);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [openPanel, setOpenPanel] = useState<ComposerPanel>(null);

    const textarea = useRef<HTMLTextAreaElement>(null);
    const imageInput = useRef<HTMLInputElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const hasAttachmentsEnabled = Boolean(enabledFeatures?.includes('attachments'));
    const hasEmojiPickerEnabled = Boolean(enabledFeatures?.includes('emoji_picker'));
    // Cờ của SDK thắng cấu hình hộp thư khi được đặt tường minh.
    const canHandleAttachments = shouldShowFilePicker !== undefined ? shouldShowFilePicker : hasAttachmentsEnabled;
    const canPickReactions = (shouldShowEmojiPicker ?? true) && (hasEmojiPickerEnabled || stickers.length > 0);

    const hasContent = userInput.trim().length > 0 || pendingFiles.length > 0;

    const typingIndicator = useRef(
        createTypingIndicator(
            () => void widgetStore.toggleUserTyping('on'),
            () => void widgetStore.toggleUserTyping('off'),
            TYPING_INDICATOR_IDLE_TIME,
        ),
    );

    const focusInput = () => textarea.current?.focus();

    useEffect(() => {
        if (isWidgetOpen) focusInput();
    }, [isWidgetOpen]);

    useEffect(() => {
        writeComposerDraft(userInput);
    }, [userInput]);

    useEffect(() => {
        const element = textarea.current;
        if (!element) return;
        element.style.height = 'auto';
        element.style.height = userInput ? `${Math.min(element.scrollHeight, 120)}px` : '';
    }, [userInput]);

    const addFiles = (files: File[]) => {
        const acceptedFiles = files.filter(file => checkFileSizeLimit(file, maximumFileUploadSize));
        if (acceptedFiles.length < files.length) {
            widgetStore.showBanner({
                message: t('FILE_SIZE_LIMIT', { MAXIMUM_FILE_UPLOAD_SIZE: maximumFileUploadSize }),
                type: 'error',
            });
        }
        if (acceptedFiles.length) setPendingFiles(current => [...current, ...acceptedFiles]);
        focusInput();
    };

    const sendComposer = () => {
        const caption = userInput.trim();
        if (pendingFiles.length) {
            void onSendFiles(pendingFiles, caption);
            setPendingFiles([]);
        } else if (caption) {
            void onSendMessage(userInput);
        } else {
            return;
        }
        setUserInput('');
        setOpenPanel(null);
        focusInput();
    };

    useEffect(() => {
        const handleClipboardPaste = (event: ClipboardEvent) => {
            if (!canHandleAttachments) return;
            const pastedFiles = Array.from(event.clipboardData?.items ?? [])
                .filter(item => item.kind === 'file')
                .map(item => item.getAsFile())
                .filter((file): file is File => Boolean(file));
            if (!pastedFiles.length) return;
            event.preventDefault();
            addFiles(pastedFiles);
        };
        document.addEventListener('paste', handleClipboardPaste);
        return () => document.removeEventListener('paste', handleClipboardPaste);
    });

    const togglePanel = (panel: Exclude<ComposerPanel, null>) =>
        setOpenPanel(current => (current === panel ? null : panel));

    const readPickedFiles = (input: HTMLInputElement) => {
        addFiles(Array.from(input.files ?? []));
        input.value = '';
    };

    return (
        <div
            className="relative"
            onKeyDown={event => {
                if (event.key === 'Escape' && openPanel) {
                    event.stopPropagation();
                    setOpenPanel(null);
                }
            }}
        >
            {pendingFiles.length ? (
                <AttachmentTray
                    files={pendingFiles}
                    onRemove={fileIndex => setPendingFiles(current => current.filter((_, index) => index !== fileIndex))}
                    onAddMore={() => imageInput.current?.click()}
                />
            ) : null}
            <div className="relative flex items-end gap-1 px-2 py-2">
                {canHandleAttachments ? (
                    <div className="relative">
                        <button
                            type="button"
                            aria-label={t('COMPOSER.ADD')}
                            title={t('COMPOSER.ADD')}
                            aria-expanded={openPanel === 'attach-menu'}
                            className={ACTION_BUTTON_CLASS}
                            onClick={() => togglePanel('attach-menu')}
                        >
                            <span className="i-lucide-plus size-[22px]" />
                        </button>
                        {openPanel === 'attach-menu' ? (
                            <AttachMenu
                                maximumFileSizeMb={maximumFileUploadSize}
                                onPickImages={() => imageInput.current?.click()}
                                onPickFiles={() => fileInput.current?.click()}
                                onClose={() => setOpenPanel(null)}
                            />
                        ) : null}
                        {/* reset-base: né rule `input:not(.reset-base)` của widget.scss — nó ép display:block. */}
                        <input
                            ref={imageInput}
                            type="file"
                            multiple
                            accept="image/*"
                            data-testid="composer-image-input"
                            className="reset-base hidden"
                            onChange={event => readPickedFiles(event.target)}
                        />
                        <input
                            ref={fileInput}
                            type="file"
                            multiple
                            accept={ALLOWED_FILE_TYPES}
                            data-testid="composer-file-input"
                            className="reset-base hidden"
                            onChange={event => readPickedFiles(event.target)}
                        />
                    </div>
                ) : null}
                <div className="flex items-end flex-1 min-w-0 min-h-11 rounded-3xl bg-[var(--yona-chat-field)] ps-4 pe-1">
                    <textarea
                        id="chat-input"
                        ref={textarea}
                        rows={1}
                        value={userInput}
                        aria-label={t('CHAT_PLACEHOLDER')}
                        placeholder={pendingFiles.length ? t('COMPOSER.CAPTION_PLACEHOLDER') : t('CHAT_PLACEHOLDER')}
                        className="user-message-input reset-base flex-1 min-w-0 self-center !bg-transparent !py-2.5 text-[15px] leading-5 text-[var(--yona-chat-ink)] placeholder:text-[var(--yona-chat-ink-muted)]"
                        onChange={event => setUserInput(event.target.value)}
                        onKeyDown={event => {
                            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                event.preventDefault();
                                sendComposer();
                            }
                        }}
                        onKeyUp={() => typingIndicator.current.start()}
                        onBlur={() => typingIndicator.current.stop()}
                    />
                    {canPickReactions ? (
                        <button
                            type="button"
                            aria-label={t('COMPOSER.STICKER')}
                            title={t('COMPOSER.STICKER')}
                            aria-expanded={openPanel === 'stickers'}
                            className={`${ACTION_BUTTON_CLASS} ${openPanel === 'stickers' ? '!text-[var(--yona-chat-accent)]' : ''}`}
                            onClick={() => togglePanel('stickers')}
                        >
                            <span className="i-lucide-smile size-[22px]" />
                        </button>
                    ) : null}
                </div>
                <button
                    type="submit"
                    aria-label={t('COMPOSER.SEND')}
                    title={t('COMPOSER.SEND')}
                    disabled={!hasContent}
                    data-state={hasContent ? 'ready' : 'idle'}
                    className={`flex flex-shrink-0 items-center justify-center rounded-full size-11 transition-colors ${
                        hasContent
                            ? 'bg-[var(--yona-chat-accent)] text-[var(--yona-chat-on-accent)]'
                            : 'bg-[var(--yona-chat-send-idle)] text-[var(--yona-chat-on-accent)] cursor-default'
                    }`}
                    onClick={sendComposer}
                >
                    <FluentIcon icon="send" size="20" />
                </button>
            </div>
            {openPanel === 'stickers' ? (
                <StickerPanel
                    stickers={stickers}
                    onSelectEmoji={emoji => {
                        setUserInput(current => `${current}${emoji}`);
                    }}
                    onSelectSticker={sticker => {
                        setOpenPanel(null);
                        void onSendSticker(sticker);
                    }}
                />
            ) : null}
        </div>
    );
}
