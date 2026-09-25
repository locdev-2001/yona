import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { createTypingIndicator } from '@ext/utils';

import { fitAutoGrowHeight } from 'shared/helpers/autoGrowField';
import { checkFileSizeLimit, DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE } from 'shared/helpers/FileHelper';
import { ALLOWED_FILE_TYPES } from 'shared/constants/messages';

import { TYPING_INDICATOR_IDLE_TIME } from '../helpers/constants';
import { useWidgetState } from '../store/hooks';
import { widgetStore } from '../store/widgetStore';
import { t } from '../i18n';
import AttachMenu from './composer/AttachMenu';
import AttachmentTray from './composer/AttachmentTray';
import { ArrowRightIcon, PlusIcon, SmileIcon } from './message/icons';
import StickerPanel from './composer/StickerPanel';
import { readComposerDraft, writeComposerDraft } from './composer/composerStorage';
import FailureBlock from './message/FailureBlock';
import type { WidgetSticker } from '../types';

type ComposerPanel = 'attach-menu' | 'reactions' | null;
type PickerKind = 'image' | 'file';

// Trần của ô nhập; quá trần mới cho cuộn.
const COMPOSER_MAX_HEIGHT_PX = 120;

// Mặt nút tròn 36px theo design; hộp bấm 44px, lề âm giữ đúng bố cục 36px trong viên thuốc.
const PILL_FACE_IDLE_CLASS =
    'text-[var(--yona-chat-ink-muted)] group-hover:bg-[var(--yona-chat-hover)] group-hover:text-[var(--yona-chat-ink)]';
const PILL_FACE_ACTIVE_CLASS = 'bg-[var(--yona-chat-solid)] text-[var(--yona-chat-on-solid)]';
const SEND_FACE_READY_CLASS = 'bg-[var(--yona-chat-accent)] text-[var(--yona-chat-on-accent)]';
const SEND_FACE_IDLE_CLASS = 'bg-[var(--yona-chat-send-idle)] text-[var(--yona-chat-on-send-idle)]';

function PillButton({ faceClass, children, ...buttonProps }: ButtonHTMLAttributes<HTMLButtonElement> & { faceClass: string }) {
    return (
        <button
            type="button"
            {...buttonProps}
            className="group relative -m-1 flex size-11 flex-none items-center justify-center rounded-full outline-none disabled:cursor-default active:scale-[0.97]"
        >
            <span
                className={`flex size-9 items-center justify-center rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-[var(--yona-chat-accent)] ${faceClass}`}
            >
                {children}
            </span>
        </button>
    );
}

interface ChatInputWrapProps {
    onSendMessage: (content: string) => void | Promise<void>;
    onSendFiles: (files: File[], caption: string) => void | Promise<void>;
    onSendSticker: (sticker: WidgetSticker) => void | Promise<void>;
}

const pickerKindOf = (files: File[]): PickerKind =>
    files.every(file => file.type.startsWith('image/')) ? 'image' : 'file';

// Cờ "bộ chọn biểu tượng cảm xúc" chỉ bật/tắt emoji; sticker theo danh mục của kênh.
const reactionButtonLabelKey = (canPickEmoji: boolean, canPickStickers: boolean): string => {
    if (canPickEmoji && canPickStickers) return 'COMPOSER.STICKER';
    return canPickStickers ? 'STICKER_PANEL.TAB_STICKER' : 'COMPOSER.EMOJI';
};

// Ô nhập dạng viên thuốc: chữ, rồi ba nút "+" (ảnh/tệp), emoji/sticker, gửi nằm
// trong viên thuốc. Tệp chọn vào khay trước, gửi thành MỘT tin kèm chú thích.
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
    const [oversizedPick, setOversizedPick] = useState<PickerKind | null>(null);

    const textarea = useRef<HTMLTextAreaElement>(null);
    const imageInput = useRef<HTMLInputElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    const hasAttachmentsEnabled = Boolean(enabledFeatures?.includes('attachments'));
    const hasEmojiPickerEnabled = Boolean(enabledFeatures?.includes('emoji_picker'));
    // Cờ của SDK thắng cấu hình hộp thư khi được đặt tường minh.
    const canHandleAttachments = shouldShowFilePicker !== undefined ? shouldShowFilePicker : hasAttachmentsEnabled;
    const canPickEmoji = (shouldShowEmojiPicker ?? true) && hasEmojiPickerEnabled;
    const canPickStickers = stickers.length > 0;
    const canOpenReactions = canPickEmoji || canPickStickers;
    const reactionLabel = t(reactionButtonLabelKey(canPickEmoji, canPickStickers));

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

    // Rỗng vẫn đo: một dòng thật, không để CSS rơi xuống thấp hơn dòng chữ. Khung chưa
    // hiện (widget đang đóng) thì đo ra 0, trả về chiều cao tự nhiên của một dòng.
    useLayoutEffect(() => {
        const element = textarea.current;
        if (!element) return;
        element.style.height = 'auto';
        if (!element.scrollHeight) {
            element.style.height = '';
            element.style.overflowY = '';
            return;
        }
        const { height, overflowY } = fitAutoGrowHeight(element.scrollHeight, COMPOSER_MAX_HEIGHT_PX);
        element.style.height = `${height}px`;
        element.style.overflowY = overflowY;
    }, [userInput, pendingFiles.length, isWidgetOpen]);

    const openPicker = (kind: PickerKind) => (kind === 'image' ? imageInput : fileInput).current?.click();

    const addFiles = (files: File[]) => {
        const acceptedFiles = files.filter(file => checkFileSizeLimit(file, maximumFileUploadSize));
        const oversizedFiles = files.filter(file => !acceptedFiles.includes(file));
        setOversizedPick(oversizedFiles.length ? pickerKindOf(oversizedFiles) : null);
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
        setOversizedPick(null);
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

    const pillFaceClass = (isActive: boolean) => (isActive ? PILL_FACE_ACTIVE_CLASS : PILL_FACE_IDLE_CLASS);

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
            {openPanel === 'attach-menu' ? (
                <AttachMenu
                    maximumFileSizeMb={maximumFileUploadSize}
                    onPickImages={() => openPicker('image')}
                    onPickFiles={() => openPicker('file')}
                    onClose={() => setOpenPanel(null)}
                />
            ) : null}
            {openPanel === 'reactions' ? (
                <StickerPanel
                    stickers={canPickStickers ? stickers : []}
                    canPickEmoji={canPickEmoji}
                    onSelectEmoji={emoji => {
                        setUserInput(current => `${current}${emoji}`);
                    }}
                    onSelectSticker={sticker => {
                        setOpenPanel(null);
                        void onSendSticker(sticker);
                    }}
                />
            ) : null}
            {oversizedPick ? (
                <div className="mb-[9px]">
                    <FailureBlock
                        title={t(
                            oversizedPick === 'image'
                                ? 'ATTACHMENT_STATE.UPLOAD_FAILED_TITLE'
                                : 'ATTACHMENT_STATE.UPLOAD_FAILED_FILE_TITLE',
                        )}
                        reason={t('ATTACHMENT_STATE.UPLOAD_FAILED_SIZE', { size: `${maximumFileUploadSize} MB` })}
                        actionLabel={t('ATTACHMENT_STATE.RETRY')}
                        onAction={() => openPicker(oversizedPick)}
                    />
                </div>
            ) : null}
            {pendingFiles.length ? (
                <AttachmentTray
                    files={pendingFiles}
                    onRemove={fileIndex => setPendingFiles(current => current.filter((_, index) => index !== fileIndex))}
                    onAddMore={() => openPicker('image')}
                />
            ) : null}
            <div className="yona-composer-pill relative z-50 flex items-end gap-1 rounded-[24px] border border-[var(--yona-chat-line)] bg-[var(--yona-chat-field)] py-[5px] pe-[6px] ps-4">
                <textarea
                    id="chat-input"
                    ref={textarea}
                    rows={1}
                    value={userInput}
                    aria-label={t('CHAT_PLACEHOLDER')}
                    placeholder={pendingFiles.length ? t('COMPOSER.CAPTION_PLACEHOLDER') : t('CHAT_PLACEHOLDER')}
                    className="user-message-input reset-base flex-1 min-w-0 self-center"
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
                {canHandleAttachments ? (
                    <PillButton
                        aria-label={t('COMPOSER.ADD')}
                        title={t('COMPOSER.ADD')}
                        aria-expanded={openPanel === 'attach-menu'}
                        faceClass={pillFaceClass(openPanel === 'attach-menu')}
                        onClick={() => togglePanel('attach-menu')}
                    >
                        <PlusIcon />
                    </PillButton>
                ) : null}
                {canOpenReactions ? (
                    <PillButton
                        aria-label={reactionLabel}
                        title={reactionLabel}
                        aria-expanded={openPanel === 'reactions'}
                        faceClass={pillFaceClass(openPanel === 'reactions')}
                        onClick={() => togglePanel('reactions')}
                    >
                        <SmileIcon />
                    </PillButton>
                ) : null}
                <PillButton
                    type="submit"
                    aria-label={t('COMPOSER.SEND')}
                    title={t('COMPOSER.SEND')}
                    disabled={!hasContent}
                    data-state={hasContent ? 'ready' : 'idle'}
                    faceClass={hasContent ? SEND_FACE_READY_CLASS : SEND_FACE_IDLE_CLASS}
                    onClick={sendComposer}
                >
                    <ArrowRightIcon />
                </PillButton>
            </div>
            {canHandleAttachments ? (
                <>
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
                </>
            ) : null}
        </div>
    );
}
