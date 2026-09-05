import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Editor from 'dashboard/components/widgets/WootWriter/Editor';
import type { EditorHandle } from 'dashboard/components/widgets/WootWriter/Editor';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import AttachmentsPreview from 'dashboard/components/widgets/AttachmentsPreview';
import type { PendingAttachment } from 'dashboard/components/widgets/AttachmentsPreview';
import { appendSignature, removeSignature } from 'dashboard/helper/editorHelper';
import { isEditorHotKeyEnabled } from 'dashboard/composables/useUISettings';
import { useAlert } from 'dashboard/composables/useAlert';
import { MESSAGE_MAX_LENGTH } from 'dashboard/conversation/constants';
import { DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE, checkFileSizeLimit } from 'shared/helpers/FileHelper';

import { t } from '../../../i18n';
import { sendMessage } from '../api';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import MessageSignatureMissingAlert from './MessageSignatureMissingAlert';
import ReplyTopPanel from './ReplyTopPanel';
import ReplyBottomPanel from './ReplyBottomPanel';

// Port từ dashboard/components/widgets/conversation/ReplyBox.vue — rút về kênh
// Channel::Api (B3): isWithinMessagingWindow luôn true (can_reply || isAPIInbox),
// editor khóa khi hết cửa sổ trả lời và không ở private note. Đính kèm: chọn
// file + kiểm size + preview/gỡ như gốc (fileUploadMixin.onIndirectFileUpload).
// B9: tin CÓ tệp đi thẳng multipart qua conversation/api.ts rồi chờ kết quả —
// xóa soạn thảo khi thành công, giữ preview + báo lỗi khi backend từ chối; tin
// chỉ có chữ vẫn theo đường sendReply (pending → sent) của spine. Bỏ: draft
// (B10), reply-to (B10/B11), ghi âm (voice recorder), email head/quoted reply,
// WhatsApp templates, copilot editor, canned '/' + mention @ + variables,
// ReplyBoxBanner, paste đính kèm (kênh API chưa cần).

const CHANNEL_TYPE = 'Channel::Api';
// slugifyChannel('Channel::Api') của useUISettings.js gốc → 'channel_api'.
const SIGNATURE_FLAG_KEY = 'channel_api_signature_enabled';

function isMacOS(): boolean {
    return navigator.platform.startsWith('Mac') || navigator.platform === 'iPhone';
}

// useKbd(['$mod', '+', 'enter']) của bản gốc: '⌘ + ↵' (mac) / 'CTRL + ↵'.
function cmdEnterShortcutLabel(): string {
    return [isMacOS() ? '⌘' : 'Ctrl', '+', '↵'].join(' ').toUpperCase();
}

interface ReplyBoxProps {
    onToggleEditorSize?: () => void;
    onMessageSent?: () => void;
}

export default function ReplyBox({ onToggleEditorSize, onMessageSent }: ReplyBoxProps) {
    const {
        selectedConversation,
        conversationId,
        accountId,
        sendReply,
        uiSettings,
        updateUISettings,
        toggleTypingStatus,
    } = useConversation();
    const { auth, currentAccount } = usePage<DashboardPageProps>().props;
    const user = auth.user!;
    const messageSignature = user.message_signature ?? '';
    // isCloudFeatureEnabled/isFeatureEnabledonAccount gốc = tra cờ trong account.features.
    const captainTasksEnabled = Boolean(currentAccount.features.captain_tasks);
    const voiceRecorderEnabled = Boolean(currentAccount.features.voice_recorder);

    const [replyType, setReplyType] = useState<string>(REPLY_EDITOR_MODES.REPLY);
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<PendingAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const editorRef = useRef<EditorHandle>(null);

    const canReply = selectedConversation?.can_reply ?? false;
    // API inbox: canSendPublicReply luôn true → isPrivate chỉ theo replyType.
    const isPrivate = replyType === REPLY_EDITOR_MODES.NOTE;
    const isOnPrivateNote = isPrivate;
    const isEditorDisabled = !isOnPrivateNote && !canReply;
    // showAudioRecorder gốc = !isOnPrivateNote && showFileUpload (API inbox → true).
    const showAudioRecorder = voiceRecorderEnabled && !isOnPrivateNote;

    const sendWithSignature = Boolean(uiSettings[SIGNATURE_FLAG_KEY]);
    const isSignatureEnabledForInbox = !isPrivate && sendWithSignature;
    const isSignatureAvailable = Boolean(messageSignature);
    const isSignatureActive = isSignatureEnabledForInbox && isSignatureAvailable;

    const maxLength = MESSAGE_MAX_LENGTH.GENERAL;
    const isMessageLengthReachingThreshold = message.length > maxLength - 50;
    const charactersRemaining = maxLength - message.length;

    const isMessageEmpty = !message.trim().replace(/\n/g, '').length;
    const hasAttachments = attachedFiles.length > 0;
    // isReplyButtonDisabled gốc: có đính kèm thì gửi được dù chưa gõ chữ.
    const isReplyButtonDisabled =
        isEditorDisabled || isUploading || (!hasAttachments && (isMessageEmpty || message.length > maxLength));
    // hasMeaningfulEditorContent gốc: nội dung ngoài chữ ký.
    const hasContent = !isMessageEmpty && removeSignature(message, messageSignature, CHANNEL_TYPE).trim() !== '';

    const messagePlaceHolder = isEditorDisabled
        ? t('CONVERSATION.FOOTER.MESSAGING_RESTRICTED_API')
        : isPrivate
          ? t('CONVERSATION.FOOTER.PRIVATE_MSG_INPUT')
          : t('CONVERSATION.FOOTER.MSG_INPUT');

    const replyButtonLabel = (() => {
        const sendMessageText = isPrivate ? t('CONVERSATION.REPLYBOX.CREATE') : t('CONVERSATION.REPLYBOX.SEND');
        const keyLabel = isEditorHotKeyEnabled(uiSettings, 'cmd_enter') ? `(${cmdEnterShortcutLabel()})` : '(↵)';
        return `${sendMessageText} ${keyLabel}`;
    })();

    // Đổi conversation: về chế độ REPLY, xóa nội dung + đính kèm (không có draft
    // ở B3 — bản gốc khôi phục qua draftMessages store).
    useEffect(() => {
        setReplyType(REPLY_EDITOR_MODES.REPLY);
        setAttachedFiles([]);
        setMessage(
            messageSignature && Boolean(uiSettings[SIGNATURE_FLAG_KEY])
                ? appendSignature('', messageSignature, CHANNEL_TYPE)
                : '',
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    // toggleSignatureInEditor của bản gốc: watch [sendWithSignature, isPrivate]
    // → gắn/gỡ chữ ký trong editor (append idempotent, remove no-op nếu không có).
    useEffect(() => {
        if (!messageSignature) return;
        setMessage((current) =>
            isSignatureActive
                ? appendSignature(current, messageSignature, CHANNEL_TYPE)
                : removeSignature(current, messageSignature, CHANNEL_TYPE),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSignatureActive]);

    // setReplyMode gốc: đổi giữa trả lời/ghi chú thì bỏ đính kèm đang chờ
    // (luật upload của hai chế độ khác nhau).
    const setReplyMode = (mode: string) => {
        if (attachedFiles.length > 0) setAttachedFiles([]);
        setReplyType(mode);
    };

    const clearMessage = () => {
        // clearMessage gốc: reset rồi gắn lại chữ ký nếu đang bật.
        setMessage(isSignatureActive ? appendSignature('', messageSignature, CHANNEL_TYPE) : '');
        setAttachedFiles([]);
    };

    const afterSent = () => {
        clearMessage();
        editorRef.current?.focusEditorInputField();
        onMessageSent?.();
    };

    // getMessagePayload gốc gom `files` vào cùng một tin (kênh API không tách
    // chữ và tệp như Instagram/TikTok/WhatsApp).
    const sendReplyWithAttachments = async () => {
        setIsUploading(true);
        try {
            await sendMessage(accountId, conversationId, {
                content: message,
                private: isPrivate,
                files: attachedFiles.map((attachment) => attachment.resource),
            });
            afterSent();
        } catch (error: unknown) {
            const body = (error as { body?: { error?: string } }).body;
            useAlert(body?.error || t('CONVERSATION.MESSAGE_ERROR'));
        } finally {
            setIsUploading(false);
        }
    };

    const onSendReply = () => {
        if (isReplyButtonDisabled) return;
        if (hasAttachments) {
            void sendReplyWithAttachments();
            return;
        }
        if (!isMessageEmpty) {
            sendReply({ content: message, isPrivate });
        }
        afterSent();
    };

    // toggleTyping gốc: gửi typing on/off kèm isPrivate của chế độ đang soạn.
    const toggleTyping = (typingStatus: 'on' | 'off') => {
        if (!conversationId) return;
        toggleTypingStatus(typingStatus, isPrivate);
    };

    // toggleEditorSize gốc: emit lên MessagesView rồi focus lại editor.
    const toggleEditorSize = () => {
        onToggleEditorSize?.();
        window.requestAnimationFrame(() => editorRef.current?.focusEditorInputField());
    };

    // setSignatureFlagForInbox: merge vào ui_settings rồi PUT /api/v1/profile.
    const toggleMessageSignature = () => {
        updateUISettings({ [SIGNATURE_FLAG_KEY]: !sendWithSignature });
    };

    const insertEmoji = (emoji: string) => {
        editorRef.current?.insertText(emoji);
    };

    // fileUploadMixin.onIndirectFileUpload + attachFile: kiểm size (API inbox =
    // giới hạn cài đặt 40MB) rồi đọc dataURL làm thumb.
    const onFileUpload = (file: File) => {
        const maxSizeMB = DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE;
        if (!checkFileSizeLimit(file, maxSizeMB)) {
            useAlert(t('CONVERSATION.FILE_SIZE_LIMIT', { MAXIMUM_SUPPORTED_FILE_UPLOAD_SIZE: maxSizeMB }));
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = () => {
            setAttachedFiles((current) => [
                ...current,
                {
                    currentChatId: conversationId,
                    resource: file,
                    isPrivate,
                    thumb: String(reader.result ?? ''),
                    isVoiceMessage: false,
                },
            ]);
        };
    };

    return (
        <div className={`reply-box ${isPrivate ? 'is-private' : ''} ${isFocused || hasAttachments ? 'is-focused' : ''}`}>
            <ReplyTopPanel
                mode={replyType}
                isReplyRestricted={false}
                isEditorDisabled={isEditorDisabled}
                captainTasksEnabled={captainTasksEnabled}
                conversationId={conversationId}
                hasContent={hasContent}
                isMessageLengthReachingThreshold={isMessageLengthReachingThreshold}
                charactersRemaining={charactersRemaining}
                onSetReplyMode={setReplyMode}
                onToggleEditorSize={toggleEditorSize}
            />
            <div className="reply-box__top">
                <Editor
                    ref={editorRef}
                    value={message}
                    editorId={`reply-${conversationId}-${isPrivate ? REPLY_EDITOR_MODES.NOTE : REPLY_EDITOR_MODES.REPLY}`}
                    className="input popover-prosemirror-menu"
                    placeholder={messagePlaceHolder}
                    disabled={isEditorDisabled}
                    isPrivate={isOnPrivateNote}
                    channelType={CHANNEL_TYPE}
                    uiSettings={uiSettings}
                    onChange={setMessage}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onSend={onSendReply}
                    onTypingOn={() => toggleTyping('on')}
                    onTypingOff={() => toggleTyping('off')}
                />
                {hasAttachments ? (
                    <div className="bg-transparent py-0 mb-2">
                        <AttachmentsPreview className="mt-2" attachments={attachedFiles} onRemoveAttachment={setAttachedFiles} />
                    </div>
                ) : null}
                {isSignatureEnabledForInbox && !isSignatureAvailable ? (
                    <MessageSignatureMissingAlert accountId={accountId} className="mb-2" />
                ) : null}
            </div>
            <ReplyBottomPanel
                isNote={isPrivate}
                isOnPrivateNote={isOnPrivateNote}
                isEditorDisabled={isEditorDisabled}
                showAudioRecorder={showAudioRecorder}
                isSendDisabled={isReplyButtonDisabled}
                sendButtonText={isUploading ? t('CONVERSATION.UPLOADING_ATTACHMENTS') : replyButtonLabel}
                sendWithSignature={sendWithSignature}
                onSend={onSendReply}
                onFileUpload={onFileUpload}
                onToggleSignature={toggleMessageSignature}
                onSelectEmoji={insertEmoji}
            />
        </div>
    );
}
