import { useEffect, useMemo, useRef, useState } from 'react';
import { debounce, trimContent } from '@ext/utils';

import { isTouchOnlyDevice, shortcutLabel } from 'shared/helpers/kbd';
import Editor from 'dashboard/components/widgets/WootWriter/Editor';
import type { EditorHandle } from 'dashboard/components/widgets/WootWriter/Editor';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import { isEditorHotKeyEnabled } from 'dashboard/composables/useUISettings';
import { MESSAGE_MAX_LENGTH } from 'dashboard/conversation/constants';
import { useKeyboardEvents } from 'dashboard/composables/useKeyboardEvents';
import { openCommandBar } from 'dashboard/commands/commandBarStore';

import { t } from '../../../i18n';
import { draftKey, getDraft, removeDraft, setDraft } from '../draftApi';
import { useConversation } from '../ConversationContext';
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
    const { selectedConversation, conversationId, sendReply, uiSettings, toggleTypingStatus } = useConversation();

    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const editorRef = useRef<EditorHandle>(null);
    const replyBoxRef = useRef<HTMLDivElement>(null);

    const isEditorDisabled = !(selectedConversation?.can_reply ?? false);
    const maxLength = MESSAGE_MAX_LENGTH.GENERAL;
    const isMessageEmpty = !message.trim().replace(/\n/g, '').length;
    const isReplyButtonDisabled = isEditorDisabled || isMessageEmpty || message.length > maxLength;

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

    const onSendReply = () => {
        if (isReplyButtonDisabled) return;
        const contentAttributes = buildOutgoingContentAttributes({ inReplyTo: replyTarget?.id, mentions: [] });
        sendReply({ content: message, contentAttributes });
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
                {replyTarget ? <ReplyToMessage message={replyTarget} onDismiss={() => onClearReplyTarget?.()} /> : null}
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
            />
        </div>
    );
}
