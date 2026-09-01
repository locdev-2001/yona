import DOMPurify from 'dompurify';
import type { ReactNode } from 'react';

import MessageFormatter from 'shared/helpers/MessageFormatter';
import { t } from '../../../../i18n';
import MessageMeta from '../MessageMeta';
import { useMessageContext } from '../provider';
import { MESSAGE_VARIANTS, ORIENTATION } from '../constants';

// Port từ dashboard/components-next/message/bubbles/Base.vue — bỏ nhánh
// CaptainGenerationDetails (EE). inReplyTo hiếm ở B3 nhưng giữ điều kiện.

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
    children: ReactNode;
}

export default function BaseBubble({
    hideMeta = false,
    className = '',
    title,
    dataBubbleName,
    children,
}: BaseBubbleProps) {
    const { variant, orientation, inReplyTo, shouldGroupWithNext } = useMessageContext();

    const metaColorClass = variant === MESSAGE_VARIANTS.PRIVATE ? 'text-n-amber-12/50' : 'text-n-slate-11';
    const emailMetaClass = variant === MESSAGE_VARIANTS.EMAIL ? 'px-3 pb-3' : '';

    const messageClass = [
        VARIANT_BASE_MAP[variant],
        variant !== MESSAGE_VARIANTS.ACTIVITY ? ORIENTATION_MAP[orientation] : 'rounded-lg',
    ].join(' ');

    const shouldShowMeta = !hideMeta && !shouldGroupWithNext && variant !== MESSAGE_VARIANTS.ACTIVITY;

    const replyToPreview = (() => {
        if (!inReplyTo) return '';
        if (inReplyTo.content) return new MessageFormatter(inReplyTo.content).formattedMessage;
        const attachments = inReplyTo.attachments ?? [];
        if (attachments.length) {
            const fileType = attachments[0].file_type as string;
            return t(`CHAT_LIST.ATTACHMENTS.${fileType}.CONTENT`);
        }
        return t('CONVERSATION.REPLY_MESSAGE_NOT_FOUND');
    })();

    const scrollToMessage = () => {
        if (!inReplyTo) return;
        document.getElementById(`message${inReplyTo.id}`)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div
            className={`text-sm min-w-0 ${messageClass} ${variant !== MESSAGE_VARIANTS.EMAIL ? 'max-w-lg' : ''} ${className}`}
            title={title}
            data-bubble-name={dataBubbleName}
        >
            {inReplyTo && (
                <div
                    className="p-2 -mx-1 mb-2 rounded-lg cursor-pointer bg-n-alpha-black1"
                    onClick={scrollToMessage}
                >
                    <div
                        className="prose prose-bubble line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(replyToPreview) }}
                    />
                </div>
            )}
            {children}
            {shouldShowMeta && (
                <MessageMeta className={`${FLEX_ORIENTATION_MAP[orientation]} ${emailMetaClass} ${metaColorClass} mt-2`} />
            )}
        </div>
    );
}
