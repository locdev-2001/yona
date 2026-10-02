import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { debounce, getRecipients, trimContent } from '@ext/utils';

import { isTouchOnlyDevice, shortcutLabel } from 'shared/helpers/kbd';
import Editor from 'dashboard/components/widgets/WootWriter/Editor';
import type { EditorHandle } from 'dashboard/components/widgets/WootWriter/Editor';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import AttachmentsPreview from 'dashboard/components/widgets/AttachmentsPreview';
import type { PendingAttachment, UploadProgress } from 'dashboard/components/widgets/AttachmentsPreview';
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
import { DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE, checkFileSizeLimit, isFileTypeAccepted } from 'shared/helpers/FileHelper';
import { ALLOWED_FILE_TYPES } from 'shared/constants/messages';

import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { openCommandBar } from 'dashboard/commands/commandBarStore';

import { t } from '../../../i18n';
import { draftKey, getDraft, removeDraft, setDraft } from '../draftApi';
import { sendMessage } from '../api';
import type { Inbox } from 'dashboard/settings/inboxes/types';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import { useGroupMembers } from '../groupMembersApi';
import { canPickSticker, fetchStickerSuggestions, fetchStickers } from '../stickerApi';
import type { StickerItem } from '../stickerApi';
import StickerSuggestions from 'shared/sticker/StickerSuggestions';
import { stickerSuggestionQuery } from 'shared/sticker/stickerSuggestionQuery';
import { useStickerSuggestions } from './useStickerSuggestions';
import type { ConversationMessage } from '../types';
import { buildOutgoingContentAttributes } from './outgoingContentAttributes';
import ReplyToMessage from './ReplyToMessage';
import MessageSignatureMissingAlert from './MessageSignatureMissingAlert';
import ReplyBoxBanner from './ReplyBoxBanner';
import ReplyTopPanel from './ReplyTopPanel';
import ReplyBottomPanel from './ReplyBottomPanel';
import VoiceMessagePreview from './voiceRecorder/VoiceMessagePreview';
import VoiceRecorderBar from './voiceRecorder/VoiceRecorderBar';
import { useVoiceRecorder } from './voiceRecorder/useVoiceRecorder';
import { useComposerExpansion, useTypeToFocusComposer } from './useComposerExpansion';
import ComposerExpandableRegion from './ComposerExpandableRegion';
import type { VoiceRecording } from './voiceRecorder/useVoiceRecorder';
import {
    MAX_VOICE_RECORDING_SECONDS,
    VOICE_RECORDING_ERROR_KEYS,
    isVoiceRecordingSupported,
} from './voiceRecorder/voiceRecording';
import type { VoiceRecordingError } from './voiceRecorder/voiceRecording';
import type { ReplyStickerPicker } from './ReplyBottomPanel';
import type { CannedCardPayload } from 'dashboard/conversation/composer/SendCardMenu/SendCardMenu';

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
// đổi về chữ `@Tên` + `content_attributes.mentions` lúc gửi. Sticker: kênh khai
// `outbound_sticker` hoặc `outbound_image` thì có bảng chọn, chọn là gửi ngay. Ghi âm:
// cờ `voice_recorder` + kênh khai `outbound_audio` + trình duyệt có MediaRecorder thì
// nút mic mở máy ghi; bản ghi là một đính kèm `isVoiceMessage` (một bản mỗi tin),
// gửi kèm cờ `is_voice_message` để kênh có tin thoại gửi thành tin thoại. Bỏ: draft
// (B10), email head/quoted reply, WhatsApp templates, copilot editor, variables. Dán (Ctrl+V) hoặc thả tệp vào ô soạn = đính kèm như nút kẹp giấy.

const DEFAULT_CHANNEL_TYPE = 'Channel::Api';

const STICKER_SUGGESTION_CLASS_NAMES = {
    root: 'flex items-center gap-1 pt-2 pb-1 overflow-x-auto no-scrollbar',
    item: 'flex items-center justify-center shrink-0 p-1 rounded-lg transition-colors hover:bg-n-alpha-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand active:scale-[0.97]',
    image: 'pointer-events-none',
    dismiss:
        'flex items-center justify-center shrink-0 ms-auto size-8 rounded-lg text-n-slate-11 hover:bg-n-alpha-2 hover:text-n-slate-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-n-brand',
};

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
        sendSticker,
        sendStructured,
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
    const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
    // Câu trả lời mẫu có thẻ vừa được chọn ở `/`: mở sẵn dialog Gửi thẻ với thẻ này.
    const [cannedCard, setCannedCard] = useState<CannedCardPayload | null>(null);

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
    const showAudioRecorder =
        voiceRecorderEnabled &&
        !isOnPrivateNote &&
        inboxSupports(inbox, 'outbound_audio') &&
        isVoiceRecordingSupported();

    // Editor chỉ mở bảng thành viên ở chế độ Trả lời; nạp sẵn để đổi tab không phải chờ.
    const { members: groupMembers } = useGroupMembers(
        accountId,
        conversationId,
        inboxSupports(inbox, 'outbound_mention'),
    );

    // Sticker đi thẳng, không đụng bản nháp đang gõ hay tin đang trả lời.
    const canSendSticker = canPickSticker(inbox, { isOnPrivateNote, isEditorDisabled });
    const stickerPicker = useMemo<ReplyStickerPicker | null>(
        () =>
            canSendSticker
                ? { loadStickers: params => fetchStickers(accountId, conversationId, params), onSelect: sendSticker }
                : null,
        [canSendSticker, accountId, conversationId, sendSticker],
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
    const pendingVoiceMessage = attachedFiles.find(attachment => attachment.isVoiceMessage) ?? null;
    // isReplyButtonDisabled gốc: có đính kèm thì gửi được dù chưa gõ chữ.
    const isReplyButtonDisabled =
        isEditorDisabled || isUploading || (!hasAttachments && (isMessageEmpty || message.length > maxLength));
    // hasMeaningfulEditorContent gốc: nội dung ngoài chữ ký.
    const messageWithoutSignature = removeSignature(message, messageSignature, channelType);
    const hasContent = !isMessageEmpty && messageWithoutSignature.trim() !== '';

    // Gợi ý sticker khi gõ: chỉ khi được gửi sticker và chưa kèm tệp (tệp thì chữ là chú thích).
    const stickerQuery = canSendSticker && !hasAttachments ? stickerSuggestionQuery(messageWithoutSignature) : null;
    const loadStickerSuggestions = useCallback(
        (query: string, signal: AbortSignal) =>
            fetchStickerSuggestions(accountId, conversationId, query, signal).then(result => result.stickers),
        [accountId, conversationId],
    );
    const { stickers: suggestedStickers, dismiss: dismissStickerSuggestions } = useStickerSuggestions(
        stickerQuery,
        loadStickerSuggestions,
    );

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

    // Sticker gợi ý thay cho cụm chữ vừa gõ (như Zalo): gửi sticker, dọn ô soạn;
    // tin đang trả lời vẫn giữ cho câu kế tiếp.
    const sendSuggestedSticker = (sticker: StickerItem) => {
        sendSticker(sticker);
        removeFromDraft();
        clearMessage();
        editorRef.current?.focusEditorInputField();
    };

    const closeStickerSuggestions = () => {
        dismissStickerSuggestions();
        editorRef.current?.focusEditorInputField();
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
        setUploadProgress({ loadedBytes: 0, totalBytes: 0 });
        try {
            const { content, contentAttributes, isReplyingToMessage } = buildOutgoingPayload();
            await sendMessage(
                accountId,
                conversationId,
                {
                    content,
                    private: isPrivate,
                    files: attachedFiles.map((attachment) => attachment.resource),
                    is_voice_message: pendingVoiceMessage !== null,
                    ...(contentAttributes ? { content_attributes: contentAttributes } : {}),
                    ...emailPayloadFields(),
                },
                { onUploadProgress: (loadedBytes, totalBytes) => setUploadProgress({ loadedBytes, totalBytes }) },
            );
            if (isReplyingToMessage) onClearReplyTarget?.();
            afterSent();
        } catch (error: unknown) {
            const body = (error as { body?: { error?: string } }).body;
            useAlert(body?.error || t('CONVERSATION.MESSAGE_ERROR'));
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
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

    // Một tin mang tối đa một bản ghi âm: ghi lại thì thay bản cũ.
    const attachVoiceRecording = ({ file, reachedMaxDuration }: VoiceRecording) => {
        if (!checkFileSizeLimit(file, DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE)) {
            useAlert(t('CONVERSATION.FILE_SIZE_LIMIT', { MAXIMUM_SUPPORTED_FILE_UPLOAD_SIZE: DEFAULT_MAXIMUM_FILE_UPLOAD_SIZE }));
            return;
        }
        setAttachedFiles((current) => [
            ...current.filter((attachment) => !attachment.isVoiceMessage),
            { currentChatId: conversationId, resource: file, isPrivate, thumb: '', isVoiceMessage: true },
        ]);
        if (reachedMaxDuration) {
            useAlert(
                t('CONVERSATION.REPLYBOX.VOICE_RECORDER.MAX_DURATION_REACHED', {
                    minutes: Math.round(MAX_VOICE_RECORDING_SECONDS / 60),
                }),
            );
        }
    };

    const voiceRecorder = useVoiceRecorder({
        onRecorded: attachVoiceRecording,
        onError: (error: VoiceRecordingError) => useAlert(t(VOICE_RECORDING_ERROR_KEYS[error])),
    });
    const { cancel: cancelVoiceRecording } = voiceRecorder;

    // Đổi hội thoại hoặc sang Lưu ý riêng giữa chừng: bỏ bản đang ghi, nhả micro.
    useEffect(() => {
        cancelVoiceRecording();
    }, [conversationId, showAudioRecorder, cancelVoiceRecording]);

    const discardVoiceMessage = () =>
        setAttachedFiles((current) => current.filter((attachment) => !attachment.isVoiceMessage));

    // Dán hoặc thả tệp vào ô soạn: cùng luật loại tệp với nút kẹp giấy (ALLOWED_FILE_TYPES).
    const onAttachFiles = (files: File[]) => {
        files.forEach((file) => {
            if (isFileTypeAccepted(file, ALLOWED_FILE_TYPES)) {
                onFileUpload(file);
            } else {
                useAlert(t('CONVERSATION.FILE_TYPE_NOT_SUPPORTED', { fileName: file.name }));
            }
        });
    };

    const { isExpanded, expand, markPointerInsideComposer } = useComposerExpansion({
        canCollapse: !hasContent && !hasAttachments && !replyTarget && !cannedCard && voiceRecorder.status === 'idle',
        resetKey: conversationId,
    });
    useTypeToFocusComposer(editorRef, !isEditorDisabled);

    return (
        <>
            <ReplyBoxBanner message={message} isOnPrivateNote={isOnPrivateNote} />
            <div
                ref={replyBoxRef}
                className={`reply-box ${isPrivate ? 'is-private' : ''} ${isFocused || hasAttachments ? 'is-focused' : ''}`}
                data-expanded={isExpanded}
                onFocus={expand}
                onPointerDown={markPointerInsideComposer}
            >
            <ComposerExpandableRegion isExpanded={isExpanded}>
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
            </ComposerExpandableRegion>
            <div
                className="reply-box__top"
                onKeyDown={event => {
                    if (event.key === 'Escape' && suggestedStickers.length > 0) dismissStickerSuggestions();
                }}
            >
                {!isOnPrivateNote && replyTarget ? (
                    <ReplyToMessage message={replyTarget} onDismiss={() => onClearReplyTarget?.()} />
                ) : null}
                {!isOnPrivateNote && isAnEmailChannel ? (
                    <ComposerExpandableRegion isExpanded={isExpanded}>
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
                    </ComposerExpandableRegion>
                ) : null}
                <StickerSuggestions
                    stickers={suggestedStickers}
                    labels={{
                        list: t('CONVERSATION.STICKER_PICKER.SUGGESTIONS'),
                        dismiss: t('CONVERSATION.STICKER_PICKER.DISMISS_SUGGESTIONS'),
                        stickerFallback: t('CONVERSATION.STICKER_PICKER.STICKER'),
                    }}
                    dismissIcon={<span className="i-lucide-x size-4" aria-hidden="true" />}
                    classNames={STICKER_SUGGESTION_CLASS_NAMES}
                    onPick={sendSuggestedSticker}
                    onDismiss={closeStickerSuggestions}
                />
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
                    onSelectCannedCard={setCannedCard}
                    onAttachFiles={onAttachFiles}
                />
                {shouldShowQuotedPreview ? (
                    <ComposerExpandableRegion isExpanded={isExpanded}>
                        <QuotedEmailPreview
                            quotedEmailText={quotedEmailText}
                            previewText={quotedEmailPreviewText}
                            onToggle={toggleQuotedReply}
                        />
                    </ComposerExpandableRegion>
                ) : null}
                {voiceRecorder.status !== 'idle' ? (
                    <VoiceRecorderBar
                        status={voiceRecorder.status}
                        elapsedSeconds={voiceRecorder.elapsedSeconds}
                        maxSeconds={voiceRecorder.maxSeconds}
                        onStop={voiceRecorder.stop}
                        onCancel={voiceRecorder.cancel}
                    />
                ) : null}
                {pendingVoiceMessage ? (
                    <VoiceMessagePreview
                        recording={pendingVoiceMessage.resource}
                        isSending={isUploading}
                        onSend={onSendReply}
                        onDiscard={discardVoiceMessage}
                    />
                ) : null}
                {hasAttachments ? (
                    <div className="bg-transparent py-0 mb-2">
                        <AttachmentsPreview
                            className="mt-2"
                            attachments={attachedFiles}
                            uploadProgress={uploadProgress}
                            onRemoveAttachment={setAttachedFiles}
                        />
                    </div>
                ) : null}
                {isSignatureEnabledForInbox && !isSignatureAvailable ? (
                    <ComposerExpandableRegion isExpanded={isExpanded}>
                        <MessageSignatureMissingAlert accountId={accountId} className="mb-2" />
                    </ComposerExpandableRegion>
                ) : null}
            </div>
            <ReplyBottomPanel
                isNote={isPrivate}
                isOnPrivateNote={isOnPrivateNote}
                isEditorDisabled={isEditorDisabled}
                showAudioRecorder={showAudioRecorder}
                isAudioRecording={voiceRecorder.status !== 'idle'}
                onStartAudioRecording={() => void voiceRecorder.start()}
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
                stickerPicker={stickerPicker}
                sendCard={
                    isOnPrivateNote
                        ? null
                        : {
                              accountId,
                              conversationDisplayId: conversationId,
                              onSend: draft => sendStructured(draft.contentType, draft.contentAttributes, draft.content),
                              cannedCard,
                              onCannedCardConsumed: () => setCannedCard(null),
                          }
                }
            />
        </div>
    </>
    );
}
