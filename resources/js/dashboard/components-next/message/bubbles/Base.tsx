import DOMPurify from 'dompurify';
import type { MouseEvent, MouseEventHandler, ReactNode } from 'react';

import MessageFormatter from 'shared/helpers/MessageFormatter';
import { messageTimestamp } from 'shared/helpers/timeHelper';
import Icon from 'dashboard/components-next/icon/Icon';
import { t } from '../../../../i18n';
import MessageMeta from '../MessageMeta';
import MessageReactions from '../MessageReactions';
import { useMessageContext } from '../provider';
import { MESSAGE_VARIANTS, ORIENTATION } from '../constants';
import { bubbleCornerClass } from '../helpers/bubbleShape';
import { readForwardedFrom } from '../helpers/forwardedFrom';
import { readGroupSender } from '../helpers/groupSender';
import { readReactions } from '../helpers/reactions';
import { useInnerHtml } from '../helpers/useInnerHtml';

// Port từ dashboard/components-next/message/bubbles/Base.vue — bỏ nhánh
// CaptainGenerationDetails (EE).

const VARIANT_BASE_MAP: Record<string, string> = {
    [MESSAGE_VARIANTS.AGENT]: 'bg-n-solid-blue text-n-slate-12',
    [MESSAGE_VARIANTS.PRIVATE]: 'bg-n-solid-amber text-n-amber-12 [&_.prosemirror-mention-node]:font-semibold',
    [MESSAGE_VARIANTS.USER]: 'bg-n-slate-4 text-n-slate-12',
    [MESSAGE_VARIANTS.ACTIVITY]: 'bg-n-alpha-1 text-n-slate-11 text-sm',
    [MESSAGE_VARIANTS.BOT]: 'bg-n-solid-iris text-n-slate-12',
    [MESSAGE_VARIANTS.TEMPLATE]: 'bg-n-solid-iris text-n-slate-12',
    [MESSAGE_VARIANTS.ERROR]: 'bg-n-ruby-4 text-n-ruby-12',
    [MESSAGE_VARIANTS.EMAIL]: 'w-full',
    [MESSAGE_VARIANTS.UNSUPPORTED]: 'bg-n-solid-amber/70 border border-dashed border-n-amber-12 text-n-amber-12',
};

// Dấu nhận biết phía của bong bóng cho test và công cụ so ảnh, không mang style.
const SIDE_MARKER_CLASS: Record<string, string> = {
    [ORIENTATION.LEFT]: 'left-bubble',
    [ORIENTATION.RIGHT]: 'right-bubble',
};

const FLEX_ORIENTATION_MAP: Record<string, string> = {
    [ORIENTATION.LEFT]: 'justify-start',
    [ORIENTATION.RIGHT]: 'justify-end',
    [ORIENTATION.CENTER]: 'justify-center',
};

interface BaseBubbleProps {
    hideMeta?: boolean;
    className?: string;
    title?: string;
    dataBubbleName?: string;
    // Nội dung sát viền (lưới ảnh): phần đầu (trích dẫn, người gửi, chuyển tiếp)
    // tự có đệm và không nới bề ngang bong bóng.
    flush?: boolean;
    onClick?: MouseEventHandler<HTMLDivElement>;
    children: ReactNode;
}

export default function BaseBubble({
    hideMeta = false,
    className = '',
    title,
    dataBubbleName,
    flush = false,
    onClick,
    children,
}: BaseBubbleProps) {
    const {
        variant,
        orientation,
        replyQuote,
        shouldGroupWithNext,
        groupPosition,
        createdAt,
        contentAttributes,
        onJumpToMessage,
    } = useMessageContext();

    // Viên cảm xúc đè mép dưới bong bóng; chừa chỗ bên dưới để không đè tin sau.
    const hasReactions = readReactions(contentAttributes).length > 0;

    // Tin nhóm: tên người gửi thật đứng trên nội dung như app gốc của kênh (ảnh
    // của người đó nằm ở cột avatar bên trái) — không có dòng này thì mọi tin
    // trong nhóm nhìn như của cùng một người.
    // Trong một nhóm tin liên tiếp, tên chỉ đứng ở tin đầu nhóm.
    const startsGroup = groupPosition === 'single' || groupPosition === 'first';
    const groupSender = orientation === ORIENTATION.LEFT && startsGroup ? readGroupSender(contentAttributes) : null;

    const forwardedFrom = readForwardedFrom(contentAttributes);
    const forwardedLabel = forwardedFrom?.senderName
        ? t('CONVERSATION.FORWARDED.FROM', { name: forwardedFrom.senderName })
        : t('CONVERSATION.FORWARDED.LABEL');
    const forwardedTitle =
        forwardedFrom?.sourceConversationId != null
            ? t('CONVERSATION.FORWARDED.SOURCE_CONVERSATION', { id: forwardedFrom.sourceConversationId })
            : undefined;


    const messageClass = [
        VARIANT_BASE_MAP[variant],
        variant !== MESSAGE_VARIANTS.ACTIVITY ? bubbleCornerClass(orientation, groupPosition) : 'rounded-lg',
        SIDE_MARKER_CLASS[orientation] ?? '',
    ].join(' ');

    // Giờ gửi không lặp dưới từng tin: rê chuột lên bong bóng để xem, mốc thời
    // gian nằm giữa các nhóm. Riêng email giữ dòng giờ trong khung thư.
    const shouldShowMeta = !hideMeta && !shouldGroupWithNext && variant === MESSAGE_VARIANTS.EMAIL;
    const sentAtTooltip = messageTimestamp(createdAt, 'LLL d, h:mm a');

    const replyQuotePreview = (() => {
        if (!replyQuote) return '';
        if (replyQuote.content) return new MessageFormatter(replyQuote.content).formattedMessage;
        if (replyQuote.attachmentType) {
            const attachmentKey = `CHAT_LIST.ATTACHMENTS.${replyQuote.attachmentType}.CONTENT`;
            const attachmentLabel = t(attachmentKey);
            if (attachmentLabel !== attachmentKey) return attachmentLabel;
        }
        if (replyQuote.unavailable) return t('CONVERSATION.REPLY_MESSAGE_NOT_FOUND');
        return t('CONVERSATION.REPLY_QUOTE.ORIGINAL');
    })();
    const replyQuoteInnerHtml = useInnerHtml(DOMPurify.sanitize(replyQuotePreview));

    const jumpToRepliedMessage = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (replyQuote?.targetId == null) return;
        onJumpToMessage?.(replyQuote.targetId);
    };

    const header = (
        <>
        {replyQuote && (
            <button
                type="button"
                data-testid="reply-quote"
                className="block w-[calc(100%+0.5rem)] p-2 -mx-1 mb-2 rounded-lg text-start bg-n-alpha-black1 cursor-pointer disabled:cursor-default"
                title={t('CONVERSATION.REPLY_QUOTE.JUMP')}
                disabled={replyQuote.targetId === null}
                onClick={jumpToRepliedMessage}
            >
                {replyQuote.senderName ? (
                    <span className="block text-xs leading-5 font-medium truncate">{replyQuote.senderName}</span>
                ) : null}
                <span
                    className="block prose prose-bubble line-clamp-2"
                    dangerouslySetInnerHTML={replyQuoteInnerHtml}
                />
            </button>
        )}
        {groupSender ? (
            <div
                className="flex items-center mb-1 min-w-0"
                title={t('CONVERSATION.MESSAGE_SENDER.IN_GROUP', { name: groupSender.name })}
            >
                <span data-testid="group-sender-name" className="text-xs leading-5 font-medium truncate text-n-slate-11">
                    {groupSender.name}
                </span>
            </div>
        ) : null}
        {forwardedFrom ? (
            <div
                data-testid="forwarded-label"
                title={forwardedTitle}
                className="flex items-center gap-1 mb-1 text-xs italic text-n-slate-11"
            >
                <Icon icon="i-lucide-forward" className="size-3 shrink-0" />
                <span className="truncate">{forwardedLabel}</span>
            </div>
        ) : null}
        </>
    );
    const hasHeader = Boolean(replyQuote || groupSender || forwardedFrom);

    return (
        <div
            className={`relative min-w-0 ${variant === MESSAGE_VARIANTS.EMAIL ? 'w-full max-w-3xl' : ''} ${hasReactions ? 'mb-4' : ''}`}
            title={sentAtTooltip}
        >
            <div
                className={`text-sm min-w-0 overflow-hidden ${messageClass} ${variant !== MESSAGE_VARIANTS.EMAIL ? 'max-w-lg' : ''} ${className}`}
                title={title}
                data-bubble-name={dataBubbleName}
                onClick={onClick}
            >
                {flush ? (hasHeader ? <div className="w-0 min-w-full px-3 pt-2">{header}</div> : null) : header}
                {children}
                {shouldShowMeta && (
                    <MessageMeta className={`${FLEX_ORIENTATION_MAP[orientation]} px-3 pb-3 text-n-slate-11 mt-2`} />
                )}
            </div>
            <MessageReactions />
        </div>
    );
}
