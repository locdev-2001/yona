import { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { debounce, getRecipients, trimContent } from '@chatwoot/utils';

import { isTouchOnlyDevice, shortcutLabel } from 'shared/helpers/kbd';
import Editor from 'dashboard/components/widgets/WootWriter/Editor';
import type { EditorHandle } from 'dashboard/components/widgets/WootWriter/Editor';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import AttachmentsPreview from 'dashboard/components/widgets/AttachmentsPreview';
import type { PendingAttachment } from 'dashboard/components/widgets/AttachmentsPreview';
import { appendSignature, removeSignature } from 'dashboard/helper/editorHelper';
import { isEditorHotKeyEnabled, quotedReplyFlagKey, signatureFlagKey } from 'dashboard/composables/useUISettings';
import { getJson } from 'dashboard/helper/apiClient';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import {
    appendQuotedTextToMessage,
    buildQuotedEmailHeader,
    extractQuotedEmailText,
    truncatePreviewText,
} from 'dashboard/helper/quotedEmailHelper';
import ReplyEmailHead from 'dashboard/components/widgets/conversation/ReplyEmailHead';
import QuotedEmailPreview from 'dashboard/components/widgets/conversation/QuotedEmailPreview';
import { useAlert } from 'dashboard/composables/useAlert';
import { extractMemberMentions } from 'dashboard/components/widgets/WootWriter/groupMemberMentions';
import { inboxSupports } from 'shared/composables/useInboxCapabilities';
import {
    AGENT_BOT_ASSIGNEE_TYPE,
    MESSAGE_MAX_LENGTH,
    MESSAGE_TYPES,
    STATUS_TYPE,
} from 'dashboard/conversation/constants';
import { DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE, checkFileSizeLimit } from 'shared/helpers/FileHelper';

import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { openCommandBar } from 'dashboard/commands/commandBarStore';

import { t } from '../../../i18n';
import { draftKey, getDraft, removeDraft, setDraft } from '../draftApi';
import { sendMessage } from '../api';
import type { Inbox } from 'dashboard/settings/inboxes/types';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { useGroupMembers } from '../groupMembersApi';
import type { ConversationMessage } from '../types';
import { buildOutgoingContentAttributes } from './outgoingContentAttributes';
import ReplyToMessage from './ReplyToMessage';
import MessageSignatureMissingAlert from './MessageSignatureMissingAlert';
import ReplyBoxBanner from './ReplyBoxBanner';
import ReplyTopPanel from './ReplyTopPanel';
import ReplyBottomPanel from './ReplyBottomPanel';

// Port từ dashboard/components/widgets/conversation/ReplyBox.vue — rút về kênh
// Channel::Api (B3): isWithinMessagingWindow luôn true (can_reply || isAPIInbox),
// editor khóa khi hết cửa sổ trả lời và không ở private note. Đính kèm: chọn
// file + kiểm size + preview/gỡ như gốc (fileUploadMixin.onIndirectFileUpload).
// B9: tin CÓ tệp đi thẳng multipart qua conversation/api.ts rồi chờ kết quả —
// xóa soạn thảo khi thành công, giữ preview + báo lỗi khi backend từ chối; tin
// chỉ có chữ vẫn theo đường sendReply (pending → sent) của spine. Trả lời trích
// dẫn: MessagesView giữ tin đang trả lời, ReplyBox chỉ hiện khối "Đang trả lời"
// và gửi kèm qua buildOutgoingContentAttributes. Nhắc tên thành viên nhóm: kênh
// khai `outbound_mention` thì `@` ở chế độ Trả lời gợi ý thành viên, link mention
// đổi về chữ `@Tên` + `content_attributes.mentions` lúc gửi. Bỏ: draft (B10), ghi
// âm (voice recorder), email head/quoted reply, WhatsApp templates, copilot editor,
// variables, Paste đính kèm (kênh API chưa cần).

const DEFAULT_CHANNEL_TYPE = 'Channel::Api';

// useKbd(['$mod', '+', 'enter']) của bản gốc: '⌘ + ↵' (mac) / 'CTRL + ↵'.
function cmdEnterShortcutLabel(): string {
    return shortcutLabel(['$mod', '+', 'enter']);
}

interface ReplyBoxProps {
    onToggleEditorSize?: () => void;
    onMessageSent?: () => void;
    // Tin đang được trả lời trích dẫn (null khi kênh không khai `outbound_reply_to`).
    replyTarget?: ConversationMessage | null;
    onClearReplyTarget?: () => void;
}

export default function ReplyBox({
    onToggleEditorSize,
    onMessageSent,
    replyTarget = null,
    onClearReplyTarget,
}: ReplyBoxProps) {
    const {
        selectedConversation,
        conversationId,
        accountId,
        messages,
        sendReply,
        uiSettings,
        updateUISettings,
        toggleTypingStatus,
    } = useConversation();
    const { auth, currentAccount, inboxes = [] } = usePage<DashboardPageProps>().props;
    const user = auth.user!;
    const messageSignature = user.message_signature ?? '';
    // isCloudFeatureEnabled/isFeatureEnabledonAccount gốc = tra cờ trong account.features.
    const captainTasksEnabled = Boolean(currentAccount.features.captain_tasks);
    const voiceRecorderEnabled = Boolean(currentAccount.features.voice_recorder);

    // channelType gốc lấy từ getter inboxes/getInbox(inbox_id). Danh sách inbox
    // chia sẻ qua Inertia chỉ có id/name/channel_type, nên kênh email nạp thêm
    // bản đầy đủ (email + forward_to_email) để dựng danh sách người nhận.
    const inbox = inboxes.find(item => item.id === selectedConversation?.inbox_id);
    const channelType = inbox?.channel_type ?? DEFAULT_CHANNEL_TYPE;
    const isAnEmailChannel = channelType === INBOX_TYPES.EMAIL;
    const [emailInbox, setEmailInbox] = useState<Inbox | null>(null);

    useEffect(() => {
        const inboxId = selectedConversation?.inbox_id;
        if (!isAnEmailChannel || !inboxId) {
            setEmailInbox(null);
            return;
        }
        void getJson<Inbox>(`/api/v1/accounts/${accountId}/inboxes/${inboxId}`).then(setEmailInbox);
    }, [accountId, isAnEmailChannel, selectedConversation?.inbox_id]);

    const [replyType, setReplyType] = useState<string>(REPLY_EDITOR_MODES.REPLY);
    const [ccEmails, setCcEmails] = useState('');
    const [bccEmails, setBccEmails] = useState('');
    const [toEmails, setToEmails] = useState('');
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<PendingAttachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const editorRef = useRef<EditorHandle>(null);
    // Bảng gợi ý `/` bung lên trên phải dừng ở mép khối soạn, không che thanh tab
    // Trả lời / Lưu ý riêng nằm ngay trên nó.
    const replyBoxRef = useRef<HTMLDivElement>(null);

    const canReply = selectedConversation?.can_reply ?? false;
    // Bot đang giữ hội thoại pending: agent chỉ ghi được ghi chú riêng cho tới
    // khi bấm "Take over" (canSendPublicReply của ReplyBox.vue).
    const isBotOwnedPendingConversation =
        selectedConversation?.status === STATUS_TYPE.PENDING &&
        selectedConversation?.meta?.assignee_type === AGENT_BOT_ASSIGNEE_TYPE;
    // API inbox: isWithinMessagingWindow luôn true → canSendPublicReply chỉ còn
    // phụ thuộc nhánh bot.
    const isPrivate = isBotOwnedPendingConversation || replyType === REPLY_EDITOR_MODES.NOTE;
    const isOnPrivateNote = isPrivate;
    const isEditorDisabled = !isOnPrivateNote && !canReply;
    // showAudioRecorder gốc = !isOnPrivateNote && showFileUpload (API inbox → true).
    const showAudioRecorder = voiceRecorderEnabled && !isOnPrivateNote;

    // Editor chỉ mở bảng thành viên ở chế độ Trả lời; nạp sẵn để đổi tab không phải chờ.
    const { members: groupMembers } = useGroupMembers(
        accountId,
        conversationId,
        inboxSupports(inbox, 'outbound_mention'),
    );

    const sendWithSignature = Boolean(uiSettings[signatureFlagKey(channelType)]);
    const isSignatureEnabledForInbox = !isPrivate && sendWithSignature;
    const isSignatureAvailable = Boolean(messageSignature);
    const isSignatureActive = isSignatureEnabledForInbox && isSignatureAvailable;

    const maxLength = isAnEmailChannel ? MESSAGE_MAX_LENGTH.EMAIL : MESSAGE_MAX_LENGTH.GENERAL;
    const isMessageLengthReachingThreshold = message.length > maxLength - 50;
    const charactersRemaining = maxLength - message.length;

    const isMessageEmpty = !message.trim().replace(/\n/g, '').length;
    const hasAttachments = attachedFiles.length > 0;
    // isReplyButtonDisabled gốc: có đính kèm thì gửi được dù chưa gõ chữ.
    const isReplyButtonDisabled =
        isEditorDisabled || isUploading || (!hasAttachments && (isMessageEmpty || message.length > maxLength));
    // hasMeaningfulEditorContent gốc: nội dung ngoài chữ ký.
    const hasContent = !isMessageEmpty && removeSignature(message, messageSignature, channelType).trim() !== '';

    // Trên thiết bị cảm ứng, placeholder bỏ phần gợi ý phím tắt.
    const isTouchOnly = isTouchOnlyDevice();
    const messagePlaceHolder = isEditorDisabled
        ? t('CONVERSATION.FOOTER.MESSAGING_RESTRICTED_API')
        : isPrivate
          ? t(isTouchOnly ? 'CONVERSATION.FOOTER.PRIVATE_MSG_INPUT_TOUCH' : 'CONVERSATION.FOOTER.PRIVATE_MSG_INPUT')
          : t(isTouchOnly ? 'CONVERSATION.FOOTER.MSG_INPUT_TOUCH' : 'CONVERSATION.FOOTER.MSG_INPUT');

    const replyButtonLabel = (() => {
        const sendMessageText = isPrivate ? t('CONVERSATION.REPLYBOX.CREATE') : t('CONVERSATION.REPLYBOX.SEND');
        if (isTouchOnly) return sendMessageText;
        const keyLabel = isEditorHotKeyEnabled(uiSettings, 'cmd_enter') ? `(${cmdEnterShortcutLabel()})` : '(↵)';
        return `${sendMessageText} ${keyLabel}`;
    })();

    // ---- Kênh email: người nhận + trích dẫn thư trước ----
    // getLastEmailInSelectedChat: tin công khai gần nhất, incoming hoặc outgoing.
    const lastEmail = useMemo(
        () =>
            [...messages]
                .reverse()
                .find(
                    item =>
                        !item.private &&
                        (item.message_type === MESSAGE_TYPES.INCOMING ||
                            item.message_type === MESSAGE_TYPES.OUTGOING),
                ) ?? null,
        [messages],
    );

    const quotedReplyPreference = isAnEmailChannel
        ? Boolean(uiSettings[quotedReplyFlagKey(channelType)])
        : false;
    const lastEmailWithQuotedContent = isAnEmailChannel && lastEmail && !lastEmail.private ? lastEmail : null;
    const quotedEmailText = extractQuotedEmailText(lastEmailWithQuotedContent);
    const quotedEmailPreviewText = truncatePreviewText(quotedEmailText, 80);
    const shouldShowQuotedReplyToggle = isAnEmailChannel && !isOnPrivateNote;
    const shouldShowQuotedPreview =
        shouldShowQuotedReplyToggle && quotedReplyPreference && Boolean(quotedEmailText);

    const toggleQuotedReply = () => {
        if (!isAnEmailChannel) return;
        updateUISettings({ [quotedReplyFlagKey(channelType)]: !quotedReplyPreference });
    };

    const getMessageWithQuotedEmailText = (content: string): string => {
        if (!quotedReplyPreference || !shouldShowQuotedReplyToggle || !quotedEmailText) return content;

        const header = buildQuotedEmailHeader(
            lastEmailWithQuotedContent,
            selectedConversation?.meta?.sender ?? null,
            emailInbox,
        );

        return appendQuotedTextToMessage(content, quotedEmailText, header);
    };

    // setCCAndToEmailsFromLastChat: chạy khi đổi hội thoại và khi tin email cuối
    // đổi (bản gốc có hai watcher riêng, cùng gọi một hàm).
    useEffect(() => {
        if (!isAnEmailChannel) {
            setToEmails('');
            setCcEmails('');
            setBccEmails('');
            return;
        }
        const conversationContact = selectedConversation?.meta?.sender?.email || '';
        const { cc, bcc, to } = getRecipients(
            lastEmail as unknown as Record<string, unknown> | null,
            conversationContact,
            emailInbox?.email ?? '',
            emailInbox?.forward_to_email ?? '',
        );
        setToEmails(to.join(', '));
        setCcEmails(cc.join(', '));
        setBccEmails(bcc.join(', '));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAnEmailChannel, conversationId, lastEmail, emailInbox]);

    // ---- Bản nháp (draftMessages) ----
    // messageRef để hàm debounce và switchDraftContext đọc giá trị mới nhất mà
    // không phải dựng lại; effect đổi ngữ cảnh cập nhật ref ngay trước setMessage.
    const messageRef = useRef(message);
    messageRef.current = message;
    const draftContextRef = useRef<{ conversationId: number; replyMode: string } | null>(null);
    const draftStateRef = useRef({ isPrivate, isEditorDisabled, sendWithSignature, messageSignature });
    draftStateRef.current = { isPrivate, isEditorDisabled, sendWithSignature, messageSignature };

    // toggleSignatureForDraft gốc: nháp lưu kèm/không kèm chữ ký theo ui_settings.
    const toggleSignatureForDraft = (draft: string): string => {
        const state = draftStateRef.current;
        if (state.isPrivate) return draft;
        if (state.isEditorDisabled && state.sendWithSignature) return draft;

        return state.sendWithSignature
            ? appendSignature(draft, state.messageSignature, channelType)
            : removeSignature(draft, state.messageSignature, channelType);
    };

    const saveDraftFor = (context: { conversationId: number; replyMode: string } | null) => {
        if (!context?.conversationId) return;
        setDraft(draftKey(context.conversationId, context.replyMode), trimContent(messageRef.current || '', maxLength));
    };

    const switchDraftContext = (nextConversationId: number, nextReplyMode: string) => {
        const current = draftContextRef.current;
        if (current?.conversationId === nextConversationId && current?.replyMode === nextReplyMode) return;

        if (current?.conversationId) saveDraftFor(current);

        draftContextRef.current = { conversationId: nextConversationId, replyMode: nextReplyMode };
        const restored = nextConversationId
            ? toggleSignatureForDraft(getDraft(draftKey(nextConversationId, nextReplyMode)))
            : '';
        messageRef.current = restored;
        setMessage(restored);
    };

    const removeFromDraft = () => {
        const current = draftContextRef.current;
        if (current?.conversationId) removeDraft(draftKey(current.conversationId, current.replyMode));
    };

    // doAutoSaveDraft gốc: debounce 500ms, immediate.
    const autoSaveDraft = useMemo(
        () => debounce(() => saveDraftFor(draftContextRef.current), 500, true),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    // Đổi conversation: về chế độ REPLY, bỏ đính kèm, chuyển ngữ cảnh nháp.
    useEffect(() => {
        setReplyType(REPLY_EDITOR_MODES.REPLY);
        setAttachedFiles([]);
        switchDraftContext(conversationId, REPLY_EDITOR_MODES.REPLY);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    // Đổi chế độ soạn (trả lời ↔ ghi chú) — mỗi chế độ một bản nháp riêng.
    useEffect(() => {
        switchDraftContext(conversationId, replyType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [replyType]);

    useEffect(() => {
        autoSaveDraft();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [message]);

    // toggleSignatureInEditor của bản gốc: watch [sendWithSignature, isPrivate]
    // → gắn/gỡ chữ ký trong editor (append idempotent, remove no-op nếu không có).
    useEffect(() => {
        if (!messageSignature) return;
        setMessage((current) =>
            isSignatureActive
                ? appendSignature(current, messageSignature, channelType)
                : removeSignature(current, messageSignature, channelType),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isSignatureActive]);

    // setReplyMode gốc: đổi giữa trả lời/ghi chú thì bỏ đính kèm đang chờ
    // (luật upload của hai chế độ khác nhau).
    const setReplyMode = (mode: string) => {
        if (attachedFiles.length > 0) setAttachedFiles([]);
        setReplyType(mode);
    };

    // Bấm Trả lời trên một bong bóng: đang ở Lưu ý riêng thì về Trả lời, rồi đưa
    // con trỏ vào ô soạn. Chỉ chạy khi tin đang trả lời đổi trong CÙNG hội thoại,
    // đổi hội thoại thì không cướp focus.
    const replyTargetId = replyTarget?.id ?? null;
    const lastReplyTargetRef = useRef({ conversationId, replyTargetId });
    useEffect(() => {
        const last = lastReplyTargetRef.current;
        lastReplyTargetRef.current = { conversationId, replyTargetId };
        if (last.conversationId !== conversationId || replyTargetId === null || last.replyTargetId === replyTargetId) {
            return;
        }
        if (replyType === REPLY_EDITOR_MODES.NOTE && !isBotOwnedPendingConversation) {
            setReplyMode(REPLY_EDITOR_MODES.REPLY);
        }
        window.requestAnimationFrame(() => editorRef.current?.focusEditorInputField());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId, replyTargetId]);

    const clearMessage = () => {
        // clearMessage gốc: reset rồi gắn lại chữ ký nếu đang bật.
        setMessage(isSignatureActive ? appendSignature('', messageSignature, channelType) : '');
        setAttachedFiles([]);
    };

    const afterSent = () => {
        removeFromDraft();
        clearMessage();
        // clearEmailField của bản gốc chạy sau khi gửi thành công.
        if (isAnEmailChannel) {
            setCcEmails('');
            setBccEmails('');
            setToEmails('');
        }
        editorRef.current?.focusEditorInputField();
        onMessageSent?.();
    };

    // getKeyboardEvents gốc: Cmd/Ctrl+K mở command bar ngay cả khi đang focus editor.
    useKeyboardEvents({
        '$mod+KeyK': {
            action: event => {
                event.preventDefault();
                openCommandBar();
            },
            allowOnFocusedInput: true,
        },
    });

    // Một chỗ dựng nội dung + content_attributes cho cả hai đường gửi. Ghi chú
    // riêng giữ nguyên markdown (nhắc tên nhân viên) và không mang trích dẫn, cũng
    // không làm mất tin đang trả lời.
    const buildOutgoingPayload = () => {
        const { content, mentions } = isPrivate ? { content: message, mentions: [] } : extractMemberMentions(message);
        const contentAttributes = buildOutgoingContentAttributes({
            inReplyTo: isPrivate ? null : replyTarget?.id,
            mentions,
        });

        return {
            content: getMessageWithQuotedEmailText(content),
            contentAttributes,
            isReplyingToMessage: Boolean(contentAttributes?.in_reply_to),
        };
    };

    // getMessagePayload gốc gom `files` vào cùng một tin (kênh API không tách
    // chữ và tệp như Instagram/TikTok/WhatsApp).
    const sendReplyWithAttachments = async () => {
        setIsUploading(true);
        try {
            const { content, contentAttributes, isReplyingToMessage } = buildOutgoingPayload();
            await sendMessage(accountId, conversationId, {
                content,
                private: isPrivate,
                files: attachedFiles.map((attachment) => attachment.resource),
                ...(contentAttributes ? { content_attributes: contentAttributes } : {}),
                ...emailPayloadFields(),
            });
            if (isReplyingToMessage) onClearReplyTarget?.();
            afterSent();
        } catch (error: unknown) {
            const body = (error as { body?: { error?: string } }).body;
            useAlert(body?.error || t('CONVERSATION.MESSAGE_ERROR'));
        } finally {
            setIsUploading(false);
        }
    };

    // getMessagePayload gốc: chỉ đính cc/bcc/to khi có giá trị và không phải note.
    const emailPayloadFields = () => ({
        ...(ccEmails && !isOnPrivateNote ? { cc_emails: ccEmails } : {}),
        ...(bccEmails && !isOnPrivateNote ? { bcc_emails: bccEmails } : {}),
        ...(toEmails && !isOnPrivateNote ? { to_emails: toEmails } : {}),
    });

    const onSendReply = () => {
        if (isReplyButtonDisabled) return;
        if (hasAttachments) {
            void sendReplyWithAttachments();
            return;
        }
        if (!isMessageEmpty) {
            const { content, contentAttributes, isReplyingToMessage } = buildOutgoingPayload();
            sendReply({
                content,
                isPrivate,
                contentAttributes,
                ...emailPayloadFields(),
            });
            if (isReplyingToMessage) onClearReplyTarget?.();
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
        updateUISettings({ [signatureFlagKey(channelType)]: !sendWithSignature });
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
        <>
            <ReplyBoxBanner message={message} isOnPrivateNote={isOnPrivateNote} />
            <div
                ref={replyBoxRef}
                className={`reply-box ${isPrivate ? 'is-private' : ''} ${isFocused || hasAttachments ? 'is-focused' : ''}`}
            >
            <ReplyTopPanel
                mode={replyType}
                isReplyRestricted={isBotOwnedPendingConversation}
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
                {!isOnPrivateNote && replyTarget ? (
                    <ReplyToMessage message={replyTarget} onDismiss={() => onClearReplyTarget?.()} />
                ) : null}
                {!isOnPrivateNote && isAnEmailChannel ? (
                    <ReplyEmailHead
                        toEmails={toEmails}
                        ccEmails={ccEmails}
                        bccEmails={bccEmails}
                        onChange={value => {
                            if (value.toEmails !== undefined) setToEmails(value.toEmails);
                            if (value.ccEmails !== undefined) setCcEmails(value.ccEmails);
                            if (value.bccEmails !== undefined) setBccEmails(value.bccEmails);
                        }}
                    />
                ) : null}
                <Editor
                    ref={editorRef}
                    pickerBoundaryRef={replyBoxRef}
                    value={message}
                    editorId={`reply-${conversationId}-${isPrivate ? REPLY_EDITOR_MODES.NOTE : REPLY_EDITOR_MODES.REPLY}`}
                    className="input popover-prosemirror-menu"
                    placeholder={messagePlaceHolder}
                    disabled={isEditorDisabled}
                    isPrivate={isOnPrivateNote}
                    channelType={channelType}
                    uiSettings={uiSettings}
                    groupMembers={groupMembers}
                    onChange={setMessage}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onSend={onSendReply}
                    onTypingOn={() => toggleTyping('on')}
                    onTypingOff={() => toggleTyping('off')}
                />
                {shouldShowQuotedPreview ? (
                    <QuotedEmailPreview
                        quotedEmailText={quotedEmailText}
                        previewText={quotedEmailPreviewText}
                        onToggle={toggleQuotedReply}
                    />
                ) : null}
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
                showQuotedReplyToggle={shouldShowQuotedReplyToggle}
                quotedReplyEnabled={quotedReplyPreference}
                onToggleQuotedReply={toggleQuotedReply}
                onSend={onSendReply}
                onFileUpload={onFileUpload}
                onToggleSignature={toggleMessageSignature}
                onSelectEmoji={insertEmoji}
            />
        </div>
    </>
    );
}
