import type { CSSProperties } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { t } from '../../../i18n';

import { MessageProvider } from './provider';
import type { MessageContextValue } from './provider';
import { CONTENT_TYPES, MESSAGE_STATUS, MESSAGE_TYPES, MESSAGE_VARIANTS, ORIENTATION, SENDER_TYPES } from './constants';
import type { MessageOrientation, MessageVariant } from './constants';
import ActivityBubble from './bubbles/Activity';
import AudioBubble from './bubbles/Audio';
import FallbackBubble from './bubbles/Fallback';
import FileBubble from './bubbles/File';
import ImageBubble from './bubbles/Image';
import EmailBubble from './bubbles/Email/Index';
import TextBubble from './bubbles/Text';
import VideoBubble from './bubbles/Video';
import { BUBBLE_NAMES, resolveBubbleName } from './helpers/attachments';
import type { MessageAttachment } from './helpers/attachments';

// Port từ dashboard/components-next/message/Message.vue. Payload spine giữ
// snake_case (message_type, content_attributes…) — map sang biến camelCase tại
// đây thay cho useCamelCase của bản gốc. Bỏ ở B3: context menu (B5), các bubble
// email/CSAT/form/location/contact/embed… (C5/F), MessageError retry (chưa có
// external_error ở API), highlight theo route messageId, WhatsappReferral.

interface MessageProps {
    message: ConversationMessage;
    channelType: string | null;
    groupWithNext?: boolean;
    // filteredCurrentChatAttachments của provider.js gốc (đọc getter store).
    chatAttachments?: MessageAttachment[];
}

const FLEX_ORIENTATION_MAP: Record<string, string> = {
    [ORIENTATION.LEFT]: 'justify-start',
    [ORIENTATION.RIGHT]: 'justify-end',
    [ORIENTATION.CENTER]: 'justify-center',
};

const GRID_CLASS_MAP: Record<string, string> = {
    [ORIENTATION.LEFT]: 'grid grid-cols-1fr',
    [ORIENTATION.RIGHT]: 'grid grid-cols-[1fr_24px]',
};

const GRID_TEMPLATE_MAP: Record<string, string> = {
    [ORIENTATION.LEFT]: '"bubble" "meta"',
    [ORIENTATION.RIGHT]: '"bubble avatar" "meta spacer"',
};

// [AGENT_BOT, CAPTAIN_ASSISTANT] của Message.vue — sender nào cũng đứng bên
// phải như tin của agent, và lấy avatar theo avatar_url.
const BOT_SENDER_TYPES: string[] = [SENDER_TYPES.AGENT_BOT, SENDER_TYPES.CAPTAIN_ASSISTANT];

const BUBBLE_COMPONENTS = {
    [BUBBLE_NAMES.TEXT]: TextBubble,
    [BUBBLE_NAMES.IMAGE]: ImageBubble,
    [BUBBLE_NAMES.VIDEO]: VideoBubble,
    [BUBBLE_NAMES.AUDIO]: AudioBubble,
    [BUBBLE_NAMES.FILE]: FileBubble,
    [BUBBLE_NAMES.FALLBACK]: FallbackBubble,
} as const;

export default function Message({
    message,
    channelType,
    groupWithNext = false,
    chatAttachments = [],
}: MessageProps) {
    const messageType = message.message_type;
    const status = message.status;
    const isPrivate = message.private;
    const contentAttributes = message.content_attributes ?? {};
    const sender = message.sender ?? null;
    const senderType = message.sender_type ?? null;
    const additionalAttributes = message.additional_attributes ?? {};

    // isEmailInbox của MessageList.vue = isAnEmailChannel của kênh đang mở.
    const isEmailInbox = channelType === INBOX_TYPES.EMAIL;
    const contentType = message.content_type ?? null;
    const isEmailMessageType =
        messageType === MESSAGE_TYPES.INCOMING || messageType === MESSAGE_TYPES.OUTGOING;

    const variant: MessageVariant = (() => {
        if (isPrivate) return MESSAGE_VARIANTS.PRIVATE;
        if (isEmailInbox && isEmailMessageType) return MESSAGE_VARIANTS.EMAIL;
        if (contentType === CONTENT_TYPES.INCOMING_EMAIL) return MESSAGE_VARIANTS.EMAIL;
        if (status === MESSAGE_STATUS.FAILED) return MESSAGE_VARIANTS.ERROR;

        const isBot =
            sender?.type === SENDER_TYPES.AGENT_BOT ||
            senderType === SENDER_TYPES.AGENT_BOT ||
            (!sender && !additionalAttributes.senderName);
        if (isBot && messageType === MESSAGE_TYPES.OUTGOING) return MESSAGE_VARIANTS.BOT;

        const variants: Record<number, MessageVariant> = {
            [MESSAGE_TYPES.INCOMING]: MESSAGE_VARIANTS.USER,
            [MESSAGE_TYPES.ACTIVITY]: MESSAGE_VARIANTS.ACTIVITY,
            [MESSAGE_TYPES.OUTGOING]: MESSAGE_VARIANTS.AGENT,
            [MESSAGE_TYPES.TEMPLATE]: MESSAGE_VARIANTS.TEMPLATE,
        };

        return variants[messageType] ?? MESSAGE_VARIANTS.USER;
    })();

    const isBotOrAgentMessage = (() => {
        if (messageType === MESSAGE_TYPES.ACTIVITY) return false;
        if (status === MESSAGE_STATUS.PROGRESS && messageType === MESSAGE_TYPES.OUTGOING) return true;

        const senderId = message.sender_id ?? sender?.id;
        const effectiveSenderType = sender?.type ?? senderType;
        if (!effectiveSenderType || !senderId) return true;
        if (BOT_SENDER_TYPES.includes(effectiveSenderType)) return true;

        return effectiveSenderType.toLowerCase() === SENDER_TYPES.USER.toLowerCase();
    })();

    const orientation: MessageOrientation = (() => {
        if (isBotOrAgentMessage) return ORIENTATION.RIGHT;
        if (messageType === MESSAGE_TYPES.ACTIVITY) return ORIENTATION.CENTER;
        return ORIENTATION.LEFT;
    })();

    const shouldGroupWithNext = status === MESSAGE_STATUS.FAILED ? false : groupWithNext;

    const shouldShowAvatar = messageType !== MESSAGE_TYPES.ACTIVITY && orientation !== ORIENTATION.LEFT;

    const attachments = (message.attachments ?? []) as unknown as MessageAttachment[];
    // componentToRender của Message.vue: kênh email (tin công khai) và tin
    // content_type = incoming_email luôn lên bubble email trước mọi nhánh khác.
    const BubbleComponent =
        (isEmailInbox && !isPrivate && isEmailMessageType) || contentType === CONTENT_TYPES.INCOMING_EMAIL
            ? EmailBubble
            : BUBBLE_COMPONENTS[resolveBubbleName(attachments, message.content)];

    const shouldRenderMessage = Boolean(
        attachments.length > 0 ||
            message.content ||
            status === MESSAGE_STATUS.FAILED ||
            contentAttributes.external_error,
    );

    const avatarInfo = (() => {
        if (!sender) {
            const { senderName, senderAvatarUrl } = additionalAttributes;
            if (senderName) return { name: senderName, src: senderAvatarUrl ?? '' };
            return { name: t('CONVERSATION.BOT'), src: '' };
        }
        // Bot dùng avatar_url (avatar riêng hoặc avatar inbox), người dùng dùng thumbnail.
        if (sender.type && BOT_SENDER_TYPES.includes(sender.type)) {
            return { name: sender.name ?? '', src: sender.avatar_url ?? '' };
        }
        return { name: sender.name ?? '', src: sender.thumbnail ?? '' };
    })();

    const avatarTooltip = avatarInfo.name === '' ? '' : `${t('CONVERSATION.SENT_BY')} ${avatarInfo.name}`;

    const contextValue: MessageContextValue = {
        id: message.id,
        content: message.content,
        createdAt: message.created_at,
        messageType,
        status,
        isPrivate,
        sourceId: message.source_id,
        sender,
        senderType,
        contentAttributes,
        attachments,
        filteredCurrentChatAttachments: chatAttachments,
        inReplyTo: null,
        variant,
        orientation,
        shouldGroupWithNext,
        channelType,
    };

    if (!shouldRenderMessage) return null;

    return (
        <MessageProvider value={contextValue}>
            <div
                id={`message${message.id}`}
                data-message-id={message.id}
                className={`flex w-full mb-2 message-bubble-container ${FLEX_ORIENTATION_MAP[orientation]} ${
                    shouldGroupWithNext ? 'group-with-next' : ''
                }`}
            >
                {variant === MESSAGE_VARIANTS.ACTIVITY ? (
                    <div>
                        <ActivityBubble />
                    </div>
                ) : (
                    <div
                        className={`${GRID_CLASS_MAP[orientation] ?? ''} gap-x-2 ${
                            variant === MESSAGE_VARIANTS.EMAIL ? 'w-full' : ''
                        }`}
                        style={{ gridTemplateAreas: GRID_TEMPLATE_MAP[orientation] } as CSSProperties}
                    >
                        {!shouldGroupWithNext && shouldShowAvatar && (
                            <div title={avatarTooltip} className="[grid-area:avatar] flex items-end">
                                <Avatar name={avatarInfo.name} src={avatarInfo.src} size={24} />
                            </div>
                        )}
                        <div
                            className={`[grid-area:bubble] flex min-w-0 ${
                                orientation === ORIENTATION.RIGHT
                                    ? 'ltr:ml-8 rtl:mr-8 justify-end'
                                    : 'ltr:mr-8 rtl:ml-8'
                            }`}
                        >
                            <BubbleComponent />
                        </div>
                    </div>
                )}
            </div>
        </MessageProvider>
    );
}
