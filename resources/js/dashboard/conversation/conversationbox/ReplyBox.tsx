import { useEffect, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';

import Editor from 'dashboard/components/widgets/WootWriter/Editor';
import type { EditorHandle } from 'dashboard/components/widgets/WootWriter/Editor';
import { REPLY_EDITOR_MODES } from 'dashboard/components/widgets/WootWriter/constants';
import { appendSignature, removeSignature } from 'dashboard/helper/editorHelper';
import { isEditorHotKeyEnabled } from 'dashboard/composables/useUISettings';
import type { UISettings } from 'dashboard/composables/useUISettings';
import { putJson } from 'dashboard/helper/apiClient';
import { MESSAGE_MAX_LENGTH } from 'dashboard/conversation/constants';

import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { useConversation } from '../ConversationContext';
import ReplyTopPanel from './ReplyTopPanel';
import ReplyBottomPanel from './ReplyBottomPanel';

// Port từ dashboard/components/widgets/conversation/ReplyBox.vue — rút về kênh
// Channel::Api (B3): isWithinMessagingWindow luôn true (can_reply || isAPIInbox),
// editor khóa khi hết cửa sổ trả lời và không ở private note. Bỏ ở B3: draft
// (B10), reply-to (B10/B11), attachments/audio (B9), email head/quoted reply,
// WhatsApp templates, copilot (EE), canned '/' + mention @ + variables,
// ReplyBoxBanner + MessageSignatureMissingAlert, typing on/off (B4).

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

export default function ReplyBox() {
    const { selectedConversation, conversationId, sendReply } = useConversation();
    const { auth } = usePage<DashboardPageProps>().props;
    const user = auth.user!;
    const messageSignature = user.message_signature ?? '';

    const [uiSettings, setUiSettings] = useState<UISettings>(user.ui_settings ?? {});
    const [replyType, setReplyType] = useState<string>(REPLY_EDITOR_MODES.REPLY);
    const [message, setMessage] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const editorRef = useRef<EditorHandle>(null);

    const canReply = selectedConversation?.can_reply ?? false;
    // API inbox: canSendPublicReply luôn true → isPrivate chỉ theo replyType.
    const isPrivate = replyType === REPLY_EDITOR_MODES.NOTE;
    const isOnPrivateNote = isPrivate;
    const isEditorDisabled = !isOnPrivateNote && !canReply;

    const sendWithSignature = Boolean(uiSettings[SIGNATURE_FLAG_KEY]);
    const isSignatureActive = sendWithSignature && !isPrivate && Boolean(messageSignature);

    const maxLength = MESSAGE_MAX_LENGTH.GENERAL;
    const isMessageLengthReachingThreshold = message.length > maxLength - 50;
    const charactersRemaining = maxLength - message.length;

    const isMessageEmpty = !message.trim().replace(/\n/g, '').length;
    const isReplyButtonDisabled = isEditorDisabled || isMessageEmpty || message.length > maxLength;

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

    // Đổi conversation: về chế độ REPLY, xóa nội dung (không có draft ở B3 —
    // bản gốc khôi phục qua draftMessages store).
    useEffect(() => {
        setReplyType(REPLY_EDITOR_MODES.REPLY);
        setMessage(
            messageSignature && Boolean((user.ui_settings ?? {})[SIGNATURE_FLAG_KEY])
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

    const setReplyMode = (mode: string) => {
        setReplyType(mode);
    };

    const clearMessage = () => {
        // clearMessage gốc: reset rồi gắn lại chữ ký nếu đang bật.
        setMessage(isSignatureActive ? appendSignature('', messageSignature, CHANNEL_TYPE) : '');
    };

    const onSendReply = () => {
        if (isReplyButtonDisabled) return;
        sendReply({ content: message, isPrivate });
        clearMessage();
        editorRef.current?.focusEditorInputField();
    };

    // setSignatureFlagForInbox: merge vào ui_settings rồi PUT /api/v1/profile
    // (updateUISettings của store gốc).
    const toggleMessageSignature = () => {
        const nextSettings = { ...uiSettings, [SIGNATURE_FLAG_KEY]: !sendWithSignature };
        setUiSettings(nextSettings);
        void putJson('/api/v1/profile', { ui_settings: nextSettings });
    };

    const insertEmoji = (emoji: string) => {
        editorRef.current?.insertText(emoji);
    };

    return (
        <div className={`reply-box ${isPrivate ? 'is-private' : ''} ${isFocused ? 'is-focused' : ''}`}>
            <ReplyTopPanel
                mode={replyType}
                isReplyRestricted={false}
                isMessageLengthReachingThreshold={isMessageLengthReachingThreshold}
                charactersRemaining={charactersRemaining}
                onSetReplyMode={setReplyMode}
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
                />
            </div>
            <ReplyBottomPanel
                isNote={isPrivate}
                isOnPrivateNote={isOnPrivateNote}
                isEditorDisabled={isEditorDisabled}
                isSendDisabled={isReplyButtonDisabled}
                sendButtonText={replyButtonLabel}
                sendWithSignature={sendWithSignature}
                onSend={onSendReply}
                onToggleSignature={toggleMessageSignature}
                onSelectEmoji={insertEmoji}
            />
        </div>
    );
}
