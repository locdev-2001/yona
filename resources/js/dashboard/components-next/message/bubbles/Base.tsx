import DOMPurify from 'dompurify';
import type { MouseEvent, MouseEventHandler, ReactNode } from 'react';

import MessageFormatter from 'shared/helpers/MessageFormatter';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { t } from '../../../../i18n';
import MessageMeta from '../MessageMeta';
import { useMessageContext } from '../provider';
import { MESSAGE_VARIANTS, ORIENTATION } from '../constants';
import { readGroupSender } from '../helpers/groupSender';
import { groupReactions, readReactions } from '../helpers/reactions';

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

const ORIENTATION_MAP: Record<string, string> = {
    [ORIENTATION.LEFT]: 'left-bubble rounded-xl ltr:rounded-bl-sm rtl:rounded-br-sm',
    [ORIENTATION.RIGHT]: 'right-bubble rounded-xl ltr:rounded-br-sm rtl:rounded-bl-sm',
    [ORIENTATION.CENTER]: 'rounded-md',
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
    onClick?: MouseEventHandler<HTMLDivElement>;
    children: ReactNode;
}

export default function BaseBubble({
    hideMeta = false,
    className = '',
    title,
    dataBubbleName,
    onClick,
    children,
}: BaseBubbleProps) {
    const { variant, orientation, replyQuote, shouldGroupWithNext, contentAttributes, onToggleReaction } =
        useMessageContext();

    // MỞ RỘNG NGOÀI GỐC (Chatwoot v4.17.1 không có UI biểu cảm — `grep -rn
    // "reactions" refs/chatwoot/app/javascript/` = 0). Zalo là kênh chính của
    // Yona nên hàng emoji được vẽ dưới bong bóng; pixel-diff phải loại trừ
    // `[data-yona-reactions]`.
    const reactions = groupReactions(readReactions(contentAttributes));

    // Tin nhóm: người gửi thật đứng trên nội dung như app gốc của kênh — không có
    // dòng này thì mọi tin trong nhóm nhìn như của cùng một người.
    const groupSender = orientation === ORIENTATION.LEFT ? readGroupSender(contentAttributes) : null;

    const metaColorClass = variant === MESSAGE_VARIANTS.PRIVATE ? 'text-n-amber-12/50' : 'text-n-slate-11';
    const emailMetaClass = variant === MESSAGE_VARIANTS.EMAIL ? 'px-3 pb-3' : '';

    const messageClass = [
        VARIANT_BASE_MAP[variant],
        variant !== MESSAGE_VARIANTS.ACTIVITY ? ORIENTATION_MAP[orientation] : 'rounded-lg',
    ].join(' ');

    const shouldShowMeta = !hideMeta && !shouldGroupWithNext && variant !== MESSAGE_VARIANTS.ACTIVITY;

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

    const scrollToRepliedMessage = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (replyQuote?.targetId == null) return;
        document.getElementById(`message${replyQuote.targetId}`)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div
            className={`text-sm min-w-0 ${messageClass} ${variant !== MESSAGE_VARIANTS.EMAIL ? 'max-w-lg' : ''} ${className}`}
            title={title}
            data-bubble-name={dataBubbleName}
            onClick={onClick}
        >
            {replyQuote && (
                <button
                    type="button"
                    data-testid="reply-quote"
                    className="block w-[calc(100%+0.5rem)] p-2 -mx-1 mb-2 rounded-lg text-start bg-n-alpha-black1 cursor-pointer disabled:cursor-default"
                    title={t('CONVERSATION.REPLY_QUOTE.JUMP')}
                    disabled={replyQuote.targetId === null}
                    onClick={scrollToRepliedMessage}
                >
                    {replyQuote.senderName ? (
                        <span className="block text-xs font-medium truncate">{replyQuote.senderName}</span>
                    ) : null}
                    <span
                        className="block prose prose-bubble line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(replyQuotePreview) }}
                    />
                </button>
            )}
            {groupSender ? (
                <div
                    className="flex items-center gap-1.5 mb-1 min-w-0"
                    title={t('CONVERSATION.MESSAGE_SENDER.IN_GROUP', { name: groupSender.name })}
                >
                    <Avatar name={groupSender.name} src={groupSender.avatar} size={16} />
                    <span className="text-xs font-medium truncate text-n-slate-11">{groupSender.name}</span>
                </div>
            ) : null}
            {children}
            {reactions.length > 0 && (
                <div
                    data-yona-reactions
                    className={`flex gap-1 mt-1 text-sm leading-none ${FLEX_ORIENTATION_MAP[orientation]}`}
                >
                    {reactions.map(({ emoji, count, reactedBySelf }) => (
                        <button
                            key={emoji}
                            type="button"
                            disabled={!onToggleReaction}
                            aria-pressed={reactedBySelf}
                            className={`rounded-full px-1.5 py-0.5 inline-flex items-center gap-1 transition-colors duration-150 ${
                                reactedBySelf ? 'bg-n-brand/20 ring-1 ring-n-brand/40' : 'bg-n-alpha-black1'
                            } ${onToggleReaction ? 'cursor-pointer hover:bg-n-alpha-black2' : 'cursor-default'}`}
                            onClick={() => onToggleReaction?.(emoji)}
                        >
                            <span>{emoji}</span>
                            {count > 1 ? <span className="text-xs text-n-slate-11">{count}</span> : null}
                        </button>
                    ))}
                </div>
            )}
            {shouldShowMeta && (
                <MessageMeta className={`${FLEX_ORIENTATION_MAP[orientation]} ${emailMetaClass} ${metaColorClass} mt-2`} />
            )}
        </div>
    );
}
