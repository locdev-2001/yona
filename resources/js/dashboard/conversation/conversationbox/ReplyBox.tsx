import { useEffect, useMemo, useRef, useState } from 'react';
import { debounce, trimContent } from '@ext/utils';

import { isTouchOnlyDevice, shortcutLabel } from 'shared/helpers/kbd';
import Editor from 'dashboard/components/widgets/WootWriter/Editor';
import type { EditorHandle } from 'dashboard/components/widgets/WootWriter/Editor';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import { extractMemberMentions } from 'dashboard/components/widgets/WootWriter/groupMemberMentions';
import { isEditorHotKeyEnabled } from 'dashboard/composables/useUISettings';
import { MESSAGE_MAX_LENGTH } from 'dashboard/conversation/constants';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { openCommandBar } from 'dashboard/commands/commandBarStore';

import { t } from '../../../i18n';
import { draftKey, getDraft, removeDraft, setDraft } from '../draftApi';
import { fetchChatStickers } from '../api';
import { useConversation } from '../ConversationContext';
import { toMentionable } from '../groupMembersApi';
import type { ConversationMessage } from '../types';
import { buildOutgoingContentAttributes } from './outgoingContentAttributes';
import ReplyToMessage from './ReplyToMessage';
import ReplyBottomPanel from './ReplyBottomPanel';
import { useComposerExpansion, useTypeToFocusComposer } from './useComposerExpansion';

// Ô soạn tin: chữ + emoji + trả lời trích dẫn, bản nháp giữ theo từng cuộc trò
// chuyện. Bấm Gửi là tin hiện ngay trong khung chat và ô soạn trống ngay; lỗi thì
// bong bóng giữ nội dung kèm Gửi lại / Xoá.

// '⌘ + ↵' (mac) / 'CTRL + ↵'.
function cmdEnterShortcutLabel(): string {
    return shortcutLabel(['$mod', '+', 'enter']);
}

interface ReplyBoxProps {
    onToggleEditorSize?: () => void;
    onMessageSent?: () => void;
    replyTarget?: ConversationMessage | null;
    onClearReplyTarget?: () => void;
}

export default function ReplyBox({ onMessageSent, replyTarget = null, onClearReplyTarget }: ReplyBoxProps) {
    const {
        selectedConversation,
        conversationId,
        sendReply,
        uiSettings,
        toggleTypingStatus,
        groupMembers,
        currentUserId,
        editingMessage,
        setEditingMessage,
        submitEdit,
        sendFiles,
        sendSticker,
    } = useConversation();
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    useEffect(() => setPendingFiles([]), [conversationId]);
    const mentionableMembers = useMemo(
        () => groupMembers.filter(member => member.id !== currentUserId).map(toMentionable),
        [groupMembers, currentUserId],
    );

    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const editorRef = useRef<EditorHandle>(null);
    const replyBoxRef = useRef<HTMLDivElement>(null);

    const isEditorDisabled = !(selectedConversation?.can_reply ?? false);
    const maxLength = MESSAGE_MAX_LENGTH.GENERAL;
    const isMessageEmpty = !message.trim().replace(/\n/g, '').length;
    const isReplyButtonDisabled = isEditorDisabled || (isMessageEmpty && pendingFiles.length === 0) || message.length > maxLength;

    const isTouchOnly = isTouchOnlyDevice();
    const messagePlaceHolder = isEditorDisabled
        ? t('CHAT.BLOCK.COMPOSER_LOCKED')
        : t('CHAT.COMPOSER.PLACEHOLDER');

    const replyButtonLabel = (() => {
        const sendMessageText = t('CONVERSATION.REPLYBOX.SEND');
        if (isTouchOnly) return sendMessageText;
        const keyLabel = isEditorHotKeyEnabled(uiSettings, 'cmd_enter') ? `(${cmdEnterShortcutLabel()})` : '(↵)';
        return `${sendMessageText} ${keyLabel}`;
    })();

    // ---- Bản nháp (localStorage, mỗi cuộc trò chuyện một bản) ----
    const messageRef = useRef(message);
    messageRef.current = message;
    const draftConversationRef = useRef<number>(0);

    const saveDraftFor = (chatId: number) => {
        if (chatId) setDraft(draftKey(chatId, REPLY_EDITOR_MODES.REPLY), trimContent(messageRef.current || '', maxLength));
    };

    const autoSaveDraft = useMemo(
        () => debounce(() => saveDraftFor(draftConversationRef.current), 500, true),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    useEffect(() => {
        if (draftConversationRef.current) saveDraftFor(draftConversationRef.current);
        draftConversationRef.current = conversationId;
        const restored = conversationId ? getDraft(draftKey(conversationId, REPLY_EDITOR_MODES.REPLY)) : '';
        messageRef.current = restored;
        setMessage(restored);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationId]);

    useEffect(() => {
        autoSaveDraft();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [message]);

    // Bấm Trả lời trên một bong bóng thì đưa con trỏ vào ô soạn (chỉ trong cùng cuộc trò chuyện).
    const replyTargetId = replyTarget?.id ?? null;
    const lastReplyTargetRef = useRef({ conversationId, replyTargetId });
    useEffect(() => {
        const last = lastReplyTargetRef.current;
        lastReplyTargetRef.current = { conversationId, replyTargetId };
        if (last.conversationId !== conversationId || replyTargetId === null || last.replyTargetId === replyTargetId) return;
        window.requestAnimationFrame(() => editorRef.current?.focusEditorInputField());
    }, [conversationId, replyTargetId]);

    // Cmd/Ctrl+K mở command bar ngay cả khi đang gõ.
    useKeyboardEvents({
        '$mod+KeyK': {
            action: event => {
                event.preventDefault();
                openCommandBar();
            },
            allowOnFocusedInput: true,
        },
    });

    // Bấm Sửa trên một tin của mình: nạp nội dung vào ô soạn.
    const editingId = editingMessage?.id ?? null;
    useEffect(() => {
        if (!editingMessage) return;
        setMessage(editingMessage.content ?? '');
        window.requestAnimationFrame(() => editorRef.current?.focusEditorInputField());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editingId]);

    const onSendReply = () => {
        if (isReplyButtonDisabled) return;
        if (editingMessage) {
            void submitEdit(extractMemberMentions(message).content);
            setMessage('');
            return;
        }
        if (pendingFiles.length) {
            void sendFiles(pendingFiles, extractMemberMentions(message).content, replyTarget?.id);
            setPendingFiles([]);
            if (replyTarget) onClearReplyTarget?.();
            if (draftConversationRef.current) removeDraft(draftKey(draftConversationRef.current, REPLY_EDITOR_MODES.REPLY));
            setMessage('');
            onMessageSent?.();
            return;
        }
        const { content, mentions } = extractMemberMentions(message);
        const contentAttributes = buildOutgoingContentAttributes({ inReplyTo: replyTarget?.id, mentions });
        sendReply({ content, contentAttributes });
        if (contentAttributes?.in_reply_to) onClearReplyTarget?.();
        if (draftConversationRef.current) removeDraft(draftKey(draftConversationRef.current, REPLY_EDITOR_MODES.REPLY));
        setMessage('');
        editorRef.current?.focusEditorInputField();
        onMessageSent?.();
    };

    const { isExpanded, expand, markPointerInsideComposer } = useComposerExpansion({
        canCollapse: isMessageEmpty && !replyTarget,
        resetKey: conversationId,
    });
    useTypeToFocusComposer(editorRef, !isEditorDisabled);

    return (
        <div
            ref={replyBoxRef}
            className={`reply-box ${isFocused ? 'is-focused' : ''}`}
            data-expanded={isExpanded}
            onFocus={expand}
            onPointerDown={markPointerInsideComposer}
        >
            <span aria-hidden="true" className="reply-box__glow" />
            <div className="reply-box__top">
                {editingMessage ? (
                    <div className="flex items-center gap-2 px-3 pt-2 text-xs text-n-slate-11">
                        <span className="i-lucide-pencil size-3.5" aria-hidden="true" />
                        <span className="flex-1 min-w-0 truncate">{t('CHAT.COMPOSER.EDITING')}</span>
                        <button
                            type="button"
                            className="grid place-content-center size-8 rounded-md hover:bg-n-alpha-2 active:scale-[0.97]"
                            aria-label={t('CONVERSATION.CANCEL')}
                            onClick={() => {
                                setEditingMessage(null);
                                setMessage('');
                            }}
                        >
                            <span className="i-lucide-x size-4" aria-hidden="true" />
                        </button>
                    </div>
                ) : null}
                {replyTarget && !editingMessage ? <ReplyToMessage message={replyTarget} onDismiss={() => onClearReplyTarget?.()} /> : null}
                {pendingFiles.length ? (
                    <ul className="flex flex-wrap gap-1.5 px-3 pt-2 m-0 list-none">
                        {pendingFiles.map((file, index) => (
                            <li key={`${file.name}-${index}`} className="flex items-center gap-1.5 h-8 ps-2 pe-1 rounded-md bg-n-alpha-2 text-xs text-n-slate-12">
                                <span className={`${file.type.startsWith('image/') ? 'i-lucide-image' : 'i-lucide-paperclip'} size-3.5`} aria-hidden="true" />
                                <span className="max-w-40 truncate">{file.name}</span>
                                <button
                                    type="button"
                                    className="grid place-content-center size-6 rounded hover:bg-n-alpha-2"
                                    aria-label={t('CONVERSATION.CANCEL')}
                                    onClick={() => setPendingFiles(current => current.filter((_, position) => position !== index))}
                                >
                                    <span className="i-lucide-x size-3.5" aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : null}
                <Editor
                    ref={editorRef}
                    pickerBoundaryRef={replyBoxRef}
                    value={message}
                    editorId={`reply-${conversationId}-${REPLY_EDITOR_MODES.REPLY}`}
                    className="input popover-prosemirror-menu"
                    placeholder={messagePlaceHolder}
                    disabled={isEditorDisabled}
                    uiSettings={uiSettings}
                    enableCannedResponses={false}
                    groupMembers={mentionableMembers}
                    onChange={setMessage}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onSend={onSendReply}
                    onTypingOn={() => toggleTypingStatus('on')}
                    onTypingOff={() => toggleTypingStatus('off')}
                />
            </div>
            <ReplyBottomPanel
                isNote={false}
                isOnPrivateNote={false}
                isEditorDisabled={isEditorDisabled}
                showAudioRecorder={false}
                isSendDisabled={isReplyButtonDisabled}
                sendButtonText={replyButtonLabel}
                sendWithSignature={false}
                onSend={onSendReply}
                onSelectEmoji={emoji => editorRef.current?.insertText(emoji)}
                onFileUpload={editingMessage ? undefined : file => setPendingFiles(current => [...current, file].slice(0, 10))}
                stickerPicker={
                    editingMessage
                        ? null
                        : {
                              loadStickers: params => fetchChatStickers(conversationId, params),
                              onSelect: sticker => void sendSticker(sticker.id),
                          }
                }
            />
        </div>
    );
}
