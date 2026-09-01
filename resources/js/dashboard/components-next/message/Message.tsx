import type { CSSProperties } from 'react';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { t } from '../../../i18n';

import { MessageProvider } from './provider';
import type { MessageContextValue } from './provider';
import { MESSAGE_STATUS, MESSAGE_TYPES, MESSAGE_VARIANTS, ORIENTATION, SENDER_TYPES } from './constants';
import type { MessageOrientation, MessageVariant } from './constants';
import ActivityBubble from './bubbles/Activity';
import TextBubble from './bubbles/Text';

// Port từ dashboard/components-next/message/Message.vue. Payload spine giữ
// snake_case (message_type, content_attributes…) — map sang biến camelCase tại
// đây thay cho useCamelCase của bản gốc. Bỏ ở B3: context menu (B5), các bubble
// media/email/CSAT… (B9+), MessageError retry (chưa có external_error ở API),
// highlight theo route messageId, WhatsappReferral.

interface MessageProps {
    message: ConversationMessage;
    channelType: string | null;
    groupWithNext?: boolean;
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

export default function Message({ message, channelType, groupWithNext = false }: MessageProps) {
    const messageType = message.message_type;
    const status = message.status;
    const isPrivate = message.private;
    const contentAttributes = message.content_attributes ?? {};
    const sender = message.sender ?? null;
    const senderType = message.sender_type ?? null;

    const variant: MessageVariant = (() => {
        if (isPrivate) return MESSAGE_VARIANTS.PRIVATE;
        if (status === MESSAGE_STATUS.FAILED) return MESSAGE_VARIANTS.ERROR;

        // Bản gốc: isBot khi sender là agent_bot hoặc không có sender lẫn
        // additional_attributes.senderName — B3 chưa có agent_bot nên rút còn !sender.
        if (!sender && messageType === MESSAGE_TYPES.OUTGOING) return MESSAGE_VARIANTS.BOT;

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

        return effectiveSenderType.toLowerCase() === SENDER_TYPES.USER.toLowerCase();
    })();

    const orientation: MessageOrientation = (() => {
        if (isBotOrAgentMessage) return ORIENTATION.RIGHT;
        if (messageType === MESSAGE_TYPES.ACTIVITY) return ORIENTATION.CENTER;
        return ORIENTATION.LEFT;
    })();

    const shouldGroupWithNext = status === MESSAGE_STATUS.FAILED ? false : groupWithNext;

    const shouldShowAvatar = messageType !== MESSAGE_TYPES.ACTIVITY && orientation !== ORIENTATION.LEFT;

    const shouldRenderMessage = Boolean(
        (message.attachments && message.attachments.length > 0) ||
            message.content ||
            status === MESSAGE_STATUS.FAILED ||
            contentAttributes.external_error,
    );

    const avatarInfo = (() => {
        if (!sender) {
            return { name: t('CONVERSATION.BOT'), src: '' };
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
        attachments: message.attachments ?? [],
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
                        className={`${GRID_CLASS_MAP[orientation] ?? ''} gap-x-2`}
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
                            <TextBubble />
                        </div>
                    </div>
                )}
            </div>
        </MessageProvider>
    );
}
