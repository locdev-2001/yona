import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { messageSentAt } from 'dashboard/conversation/messageTime';
import { resolveStructured } from 'shared/messaging';
import StructuredBubble, { ChoiceOfLabel } from './bubbles/Structured';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import { INBOX_TYPES } from 'dashboard/helper/inbox';
import type { ConversationMessage } from 'dashboard/conversation/types';
import { joinsNextMessage } from 'shared/helpers/messageGrouping';
import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import { MessageProvider } from './provider';
import type { MessageContextValue } from './provider';
import {
    ATTACHMENT_TYPES,
    CONTENT_TYPES,
    MESSAGE_STATUS,
    MESSAGE_TYPES,
    MESSAGE_VARIANTS,
    ORIENTATION,
    SENDER_TYPES,
} from './constants';
import type { MessageOrientation, MessageVariant } from './constants';
import MessageActions from './MessageActions';
import MessageError from './MessageError';
import MessageMeta from './MessageMeta';
import ActivityBubble from './bubbles/Activity';
import { callNoticeSide } from './helpers/callNotice';
import AudioBubble from './bubbles/Audio';
import FallbackBubble from './bubbles/Fallback';
import LinkPreviewBubble from './bubbles/LinkPreview';
import FileBubble from './bubbles/File';
import LocationBubble from './bubbles/Location';
import ImageBubble from './bubbles/Image';
import StickerBubble from './bubbles/Sticker';
import EmailBubble from './bubbles/Email/Index';
import TextBubble from './bubbles/Text';
import VideoBubble from './bubbles/Video';
import FriendRequestBubble from './bubbles/FriendRequest';
import ZaloBankCardBubble from './bubbles/ZaloBankCard';
import ZaloBusinessCardBubble from './bubbles/ZaloBusinessCard';
import CallMessageBubble from './bubbles/CallMessage';
import ZaloReminderBubble from './bubbles/ZaloReminder';
import PendingDocumentBubble from './bubbles/PendingDocument';
import { BUBBLE_NAMES, resolveBubbleName } from './helpers/attachments';
import type { MessageAttachment } from './helpers/attachments';
import { resolveReplyQuote } from './helpers/replyQuote';
import { BOT_SENDER_TYPES, externalEchoCopy, resolveMessageSender } from './helpers/senderIdentity';
import { useSenderIdentityContext } from './SenderIdentityContext';

// Port từ dashboard/components-next/message/Message.vue. Payload spine giữ
// snake_case (message_type, content_attributes…) — map sang biến camelCase tại
// đây thay cho useCamelCase của bản gốc. Bỏ ở B3: các bubble
// email/CSAT/form/location/contact/embed… (C5/F), MessageError retry (chưa có
// external_error ở API), highlight theo route messageId, WhatsappReferral.

interface MessageProps {
    message: ConversationMessage;
    channelType: string | null;
    inboxCapabilities?: readonly string[];
    // Vị trí trong nhóm tin liên tiếp cùng người gửi, MessageList tính bằng luật dùng chung.
    groupPosition?: MessageGroupPosition;
    resolveReactorName?: (by: string) => string | null;
    // filteredCurrentChatAttachments của provider.js gốc (đọc getter store).
    chatAttachments?: MessageAttachment[];
    // Tin được trả lời, MessageList tra sẵn: có = tin gốc · null = đã tra, không
    // có · undefined = chưa biết hoặc đang tải.
    inReplyTo?: ConversationMessage | null;
    /** Câu hỏi có lựa chọn mà tin khách này trả lời (`content_attributes.choice_of`). */
    choiceOf?: ConversationMessage | null;
    // Gửi lại tin thất bại (POST …/messages/{id}/retry) — emit `retry` của gốc.
    onRetry?: (message: ConversationMessage) => Promise<void> | void;
    onToggleReaction?: (message: ConversationMessage, emoji: string) => Promise<void> | void;
    onDeleteMessage?: (message: ConversationMessage) => Promise<void> | void;
    onReplyTo?: (message: ConversationMessage) => void;
    onForward?: (message: ConversationMessage) => void;
    onCreateCannedResponse?: (message: ConversationMessage) => void;
    onTranslate?: (message: ConversationMessage) => void;
    onJumpToMessage?: (messageId: number) => void;
}

const FLEX_ORIENTATION_MAP: Record<string, string> = {
    [ORIENTATION.LEFT]: 'justify-start',
    [ORIENTATION.RIGHT]: 'justify-end',
    [ORIENTATION.CENTER]: 'justify-center',
};

const GRID_CLASS_MAP: Record<string, string> = {
    [ORIENTATION.LEFT]: 'grid grid-cols-[32px_1fr]',
    [ORIENTATION.RIGHT]: 'grid grid-cols-[1fr_32px]',
};

const GRID_TEMPLATE_MAP: Record<string, string> = {
    [ORIENTATION.LEFT]: '"avatar bubble" "spacer meta"',
    [ORIENTATION.RIGHT]: '"bubble avatar" "meta spacer"',
};

const BUBBLE_COMPONENTS = {
    [BUBBLE_NAMES.TEXT]: TextBubble,
    [BUBBLE_NAMES.IMAGE]: ImageBubble,
    [BUBBLE_NAMES.VIDEO]: VideoBubble,
    [BUBBLE_NAMES.AUDIO]: AudioBubble,
    [BUBBLE_NAMES.FILE]: FileBubble,
    [BUBBLE_NAMES.LOCATION]: LocationBubble,
    [BUBBLE_NAMES.FALLBACK]: FallbackBubble,
} as const;

// Loại tin lõi không có content_type: driver chuẩn hoá vào
// content_attributes theo khoá của docs/channel-capabilities.md §2.1/§2.4 và chỗ
// này rẽ nhánh THEO KHOÁ, không theo kênh — đúng cách bản gốc làm với
// whatsappFlowResponse / contentAttributes.type === 'dyte' / imageType (story
// Instagram) trong componentToRender.
const CHANNEL_CARD_BUBBLES = {
    link_preview: LinkPreviewBubble,
    business_card: ZaloBusinessCardBubble,
    bank_card: ZaloBankCardBubble,
    reminder: ZaloReminderBubble,
    call: CallMessageBubble,
    friend_request: FriendRequestBubble,
} as const;

function resolveChannelCardBubble(contentAttributes: Record<string, unknown>) {
    const kind = Object.keys(CHANNEL_CARD_BUBBLES).find((key) => Boolean(contentAttributes[key]));

    return kind ? CHANNEL_CARD_BUBBLES[kind as keyof typeof CHANNEL_CARD_BUBBLES] : null;
}

export default function Message({
    message,
    channelType,
    inboxCapabilities = [],
    groupPosition = 'single',
    resolveReactorName,
    chatAttachments = [],
    inReplyTo,
    choiceOf,
    onRetry,
    onToggleReaction,
    onDeleteMessage,
    onReplyTo,
    onForward,
    onCreateCannedResponse,
    onTranslate,
    onJumpToMessage,
}: MessageProps) {
    const messageType = message.message_type;
    const status = message.status;
    const isPrivate = message.private;
    const contentAttributes = message.content_attributes ?? {};
    // Lỗi đã có từ lúc tin hiện ra là lỗi cũ trong lịch sử; chỉ lỗi xảy ra khi đang xem mới cần đọc lên.
    const failedWhenShownRef = useRef(Boolean(contentAttributes.external_error));
    const sender = message.sender ?? null;
    const senderType = message.sender_type ?? null;
    const additionalAttributes = message.additional_attributes ?? {};

    // isEmailInbox của MessageList.vue = isAnEmailChannel của kênh đang mở.
    const isEmailInbox = channelType === INBOX_TYPES.EMAIL;
    const contentType = message.content_type ?? null;
    const isEmailMessageType =
        messageType === MESSAGE_TYPES.INCOMING || messageType === MESSAGE_TYPES.OUTGOING;

    // `externalEcho` của Message.vue: tin do chính chủ hộp thư gửi thẳng từ ứng
    // dụng của kênh (ngoài Yona) rồi kênh dội lại. Không có sender nội bộ nên nếu
    // để rơi vào nhánh isBot thì nó hiện thành bong bóng "Bot" tím — sai người gửi.
    const isExternalEcho = Boolean(contentAttributes.external_echo);

    const variant: MessageVariant = (() => {
        if (isPrivate) return MESSAGE_VARIANTS.PRIVATE;
        if (isEmailInbox && isEmailMessageType) return MESSAGE_VARIANTS.EMAIL;
        if (contentType === CONTENT_TYPES.INCOMING_EMAIL) return MESSAGE_VARIANTS.EMAIL;
        if (status === MESSAGE_STATUS.FAILED) return MESSAGE_VARIANTS.ERROR;
        if (isExternalEcho) return MESSAGE_VARIANTS.AGENT;

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
        // Tin người khác gửi trong nhóm cũng có người gửi là người dùng Yona, nhưng với người xem là tin đến.
        if (messageType === MESSAGE_TYPES.INCOMING) return false;
        if (status === MESSAGE_STATUS.PROGRESS && messageType === MESSAGE_TYPES.OUTGOING) return true;

        const senderId = message.sender_id ?? sender?.id;
        const effectiveSenderType = sender?.type ?? senderType;
        if (!effectiveSenderType || !senderId) return true;
        if (BOT_SENDER_TYPES.includes(effectiveSenderType)) return true;

        return effectiveSenderType.toLowerCase() === SENDER_TYPES.USER.toLowerCase();
    })();

    const noticeSide = callNoticeSide(message);
    const isInitiatedNotice = noticeSide !== null;
    const isOwnNotice = noticeSide === 'own';

    const orientation: MessageOrientation = (() => {
        if (isBotOrAgentMessage) return ORIENTATION.RIGHT;
        if (isInitiatedNotice) return isOwnNotice ? ORIENTATION.RIGHT : ORIENTATION.LEFT;
        if (messageType === MESSAGE_TYPES.ACTIVITY) return ORIENTATION.CENTER;
        return ORIENTATION.LEFT;
    })();

    const effectiveGroupPosition: MessageGroupPosition = status === MESSAGE_STATUS.FAILED ? 'single' : groupPosition;
    const shouldGroupWithNext = joinsNextMessage(effectiveGroupPosition);

    const shouldShowAvatar = messageType !== MESSAGE_TYPES.ACTIVITY || isInitiatedNotice;
    // Thư email cao cả trang: ảnh người gửi và thanh thao tác đứng ngang đầu thư.
    const isEmailVariant = variant === MESSAGE_VARIANTS.EMAIL;

    const attachments = (message.attachments ?? []) as unknown as MessageAttachment[];
    const ChannelCardBubble = resolveChannelCardBubble(contentAttributes);
    const isPendingDocument = attachments.length === 0 && Boolean(contentAttributes.pending_document);
    // Sticker có ảnh đính kèm (contract lõi) lên bong bóng sticker; sticker chỉ
    // có markdown trong content vẫn đi bong bóng chữ.
    const isStickerWithImage =
        contentType === CONTENT_TYPES.STICKER && attachments[0]?.file_type === ATTACHMENT_TYPES.IMAGE;
    // componentToRender của Message.vue: kênh email (tin công khai) và tin
    // content_type = incoming_email luôn lên bubble email trước mọi nhánh khác;
    // các bubble đọc content_attributes đứng trước nhánh theo đính kèm.
    const BubbleComponent =
        (isEmailInbox && !isPrivate && isEmailMessageType) || contentType === CONTENT_TYPES.INCOMING_EMAIL
            ? EmailBubble
            : isStickerWithImage
              ? StickerBubble
              : isPendingDocument
                ? PendingDocumentBubble
                : (ChannelCardBubble ?? BUBBLE_COMPONENTS[resolveBubbleName(attachments, message.content)]);

    const structured =
        contentAttributes.deleted || contentAttributes.external_error
            ? null
            : resolveStructured({ ...message, content_attributes: contentAttributes });

    const shouldRenderMessage = Boolean(
        structured ||
        attachments.length > 0 ||
            isPendingDocument ||
            message.content ||
            ChannelCardBubble ||
            status === MESSAGE_STATUS.FAILED ||
            contentAttributes.external_error,
    );

    const senderIdentity = resolveMessageSender(message, useSenderIdentityContext());
    const bubbleSideClass = orientation === ORIENTATION.RIGHT ? 'ltr:ml-8 rtl:mr-8 justify-end' : 'ltr:mr-8 rtl:ml-8';

    const contextValue: MessageContextValue = {
        id: message.id,
        content: message.content,
        createdAt: messageSentAt(message),
        messageType,
        status,
        isPrivate,
        sourceId: message.source_id,
        sourceLink: message.source_link ?? null,
        sender,
        senderType,
        contentAttributes,
        attachments,
        filteredCurrentChatAttachments: chatAttachments,
        replyQuote: resolveReplyQuote(contentAttributes, inReplyTo),
        variant,
        orientation,
        shouldGroupWithNext,
        groupPosition: effectiveGroupPosition,
        channelType,
        inboxCapabilities,
        onToggleReaction: onToggleReaction ? (emoji: string) => void onToggleReaction(message, emoji) : undefined,
        resolveReactorName,
        onDeleteMessage: onDeleteMessage ? () => void onDeleteMessage(message) : undefined,
        onReplyTo: onReplyTo ? () => onReplyTo(message) : undefined,
        onForward: onForward ? () => onForward(message) : undefined,
        onCreateCannedResponse: onCreateCannedResponse ? () => onCreateCannedResponse(message) : undefined,
        onTranslate: onTranslate ? () => onTranslate(message) : undefined,
        onJumpToMessage,
    };

    if (!shouldRenderMessage) return null;

    // Trạng thái gửi và khoá ghi chú chỉ ở tin cuối nhóm; email tự vẽ dòng giờ trong khung thư.
    const showsStatusRow = !shouldGroupWithNext && variant !== MESSAGE_VARIANTS.EMAIL;
    const hasFooter = Boolean(contentAttributes.external_error) || isExternalEcho || showsStatusRow || Boolean(choiceOf);

    return (
        <MessageProvider value={contextValue}>
            <div
                id={`message${message.id}`}
                data-message-id={message.id}
                className={`flex w-full group/message message-bubble-container ${FLEX_ORIENTATION_MAP[orientation]} ${
                    shouldGroupWithNext ? 'group-with-next mb-0.5' : 'mb-3'
                }`}
            >
                {variant === MESSAGE_VARIANTS.ACTIVITY && !isInitiatedNotice ? (
                    <div>
                        <ActivityBubble />
                    </div>
                ) : (
                    <div
                        className={`${GRID_CLASS_MAP[orientation] ?? ''} gap-x-2 min-w-0 max-w-full ${
                            isEmailVariant ? 'w-full' : ''
                        }`}
                        style={{ gridTemplateAreas: GRID_TEMPLATE_MAP[orientation] } as CSSProperties}
                    >
                        {!shouldGroupWithNext && shouldShowAvatar && (
                            <div
                                title={senderIdentity.tooltip}
                                className={`[grid-area:avatar] flex ${isEmailVariant ? 'items-start pt-3' : 'items-end'}`}
                            >
                                <Avatar
                                    name={senderIdentity.name}
                                    seed={senderIdentity.seed}
                                    src={senderIdentity.src}
                                    platform={senderIdentity.platform}
                                    size={32}
                                    previewable={messageType === MESSAGE_TYPES.INCOMING}
                                />
                            </div>
                        )}
                        {isInitiatedNotice ? (
                            <div className={`[grid-area:bubble] flex min-w-0 items-end ${bubbleSideClass}`}>
                                <ActivityBubble />
                            </div>
                        ) : (
                            <MessageActions barPlacement={isEmailVariant ? 'top' : 'center'} className={`[grid-area:bubble] flex min-w-0 items-end ${bubbleSideClass}`}>
                                {structured ? <StructuredBubble resolved={structured} message={message} /> : <BubbleComponent />}
                            </MessageActions>
                        )}
                        {hasFooter ? (
                            <div
                                className={`[grid-area:meta] flex flex-wrap items-center gap-x-1.5 ${FLEX_ORIENTATION_MAP[orientation]}`}
                            >
                                {contentAttributes.external_error ? (
                                    <MessageError
                                        className={FLEX_ORIENTATION_MAP[orientation]}
                                        announce={!failedWhenShownRef.current}
                                        onRetry={onRetry ? () => onRetry(message) : undefined}
                                    />
                                ) : isExternalEcho ? (
                                    <div
                                        data-testid="external-echo-label"
                                        title={senderIdentity.tooltip}
                                        className="flex mt-1 text-xs text-n-slate-11"
                                    >
                                        {externalEchoCopy(senderIdentity.platform).label}
                                    </div>
                                ) : null}
                                {choiceOf ? <ChoiceOfLabel question={choiceOf} onJump={onJumpToMessage} /> : null}
                                {showsStatusRow ? <MessageMeta showTime={false} className="mt-1 text-n-slate-11" /> : null}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </MessageProvider>
    );
}
