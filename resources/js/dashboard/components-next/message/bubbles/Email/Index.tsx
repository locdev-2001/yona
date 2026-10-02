import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';

import { t } from '../../../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import { EmailQuoteExtractor } from 'dashboard/helper/emailQuoteExtractor';
import BaseBubble from '../Base';
import FormattedContent from '../FormattedContent';
import AttachmentChips from '../../chips/AttachmentChips';
import EmailMeta from './EmailMeta';
import EmailHtmlBody from './EmailHtmlBody';
import { COLLAPSED_BODY_HEIGHT, isBodyCollapsible, splitPlainTextQuote } from './emailLayout';
import { useMessageContext } from '../../provider';
import { MESSAGE_TYPES } from '../../constants';

// content_attributes của Yona giữ snake_case.
type EmailBody = { full?: string; reply?: string; quoted?: string };

function useObservedHeight(ref: RefObject<HTMLElement | null>): number {
    const [height, setHeight] = useState(0);

    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return undefined;

        const measure = () => setHeight(Math.round(element.offsetHeight));
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;

        const observer = new ResizeObserver(measure);
        observer.observe(element);

        return () => observer.disconnect();
    }, [ref]);

    return height;
}

export default function EmailBubble() {
    const { content, contentAttributes, attachments, messageType } = useMessageContext();

    const [isExpanded, setExpanded] = useState(false);
    const [showQuotedMessage, setShowQuotedMessage] = useState(false);
    const bodyRef = useRef<HTMLDivElement>(null);
    const bodyHeight = useObservedHeight(bodyRef);

    const isOutgoing = messageType === MESSAGE_TYPES.OUTGOING;
    const isIncoming = !isOutgoing;

    const email = (contentAttributes.email ?? {}) as {
        text_content?: EmailBody;
        html_content?: EmailBody;
    };
    const textContentFull = email.text_content?.full;
    const htmlContentFull = email.html_content?.full;
    const plainText = textContentFull ?? content ?? '';
    const isComposedReply = isOutgoing && Boolean(content) && !textContentFull && !htmlContentFull;

    const htmlParts = useMemo(
        () =>
            htmlContentFull
                ? {
                      reply: EmailQuoteExtractor.extractQuotes(htmlContentFull),
                      hasQuote: EmailQuoteExtractor.hasQuotes(htmlContentFull),
                  }
                : null,
        [htmlContentFull],
    );
    const textParts = useMemo(() => splitPlainTextQuote(plainText), [plainText]);
    const hasQuotedMessage = htmlParts ? htmlParts.hasQuote : textParts.quoted !== null;

    const isCollapsible = isBodyCollapsible(bodyHeight);
    const isCollapsed = isCollapsible && !isExpanded;
    const bubbleBackground = isIncoming ? 'bg-n-slate-4' : 'bg-n-solid-blue';
    const fadeBackground = isIncoming
        ? 'from-n-slate-4 via-n-slate-4/90 to-transparent'
        : 'from-n-solid-blue via-n-solid-blue/90 to-transparent';

    const renderBody = () => {
        if (isComposedReply) return <FormattedContent className="text-n-slate-12" content={content ?? ''} />;
        if (htmlContentFull && htmlParts) {
            return (
<EmailHtmlBody html={showQuotedMessage ? htmlContentFull : htmlParts.reply} />
            );
        }

        const visibleText =
            showQuotedMessage && textParts.quoted ? `${textParts.reply}\n\n${textParts.quoted}` : textParts.reply;

        return (
            <div className="prose prose-bubble !max-w-none whitespace-pre-wrap text-n-slate-12">{visibleText}</div>
        );
    };

    return (
        <BaseBubble className={`w-full ${bubbleBackground}`} dataBubbleName="email">
            <EmailMeta
                className={`px-3 pt-3 pb-2 border-b ${isIncoming ? 'border-n-strong' : 'border-n-slate-8/20'}`}
            />
            <section className="p-3">
                <div
                    className={`relative ${isCollapsed ? 'overflow-hidden' : ''}`}
                    style={isCollapsed ? { maxHeight: COLLAPSED_BODY_HEIGHT } : undefined}
                >
                    <div ref={bodyRef}>{renderBody()}</div>
                    {isCollapsed ? (
                        <div
                            className={`absolute inset-x-0 bottom-0 flex items-end justify-center h-28 bg-gradient-to-t ${fadeBackground}`}
                        >
                            <button
                                type="button"
                                data-testid="email-expand"
                                className="flex items-center gap-2 px-3 py-1.5 mb-1 text-sm rounded-full text-n-slate-12 bg-n-solid-1 border border-n-weak shadow-sm hover:bg-n-alpha-2"
                                onClick={() => setExpanded(true)}
                            >
                                <Icon icon="i-lucide-maximize-2" className="size-3.5" />
                                {t('EMAIL_HEADER.EXPAND')}
                            </button>
                        </div>
                    ) : null}
                </div>

                {(isCollapsible && isExpanded) || hasQuotedMessage ? (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                        {hasQuotedMessage ? (
                            <button
                                type="button"
                                data-testid="email-toggle-quote"
                                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full text-n-slate-11 bg-n-alpha-black2 hover:text-n-slate-12"
                                aria-expanded={showQuotedMessage}
                                onClick={() => setShowQuotedMessage(current => !current)}
                            >
                                <Icon icon="i-lucide-ellipsis" className="size-3.5" />
                                {showQuotedMessage ? t('CHAT_LIST.HIDE_QUOTED_TEXT') : t('CHAT_LIST.SHOW_QUOTED_TEXT')}
                            </button>
                        ) : null}
                        {isCollapsible && isExpanded ? (
                            <button
                                type="button"
                                data-testid="email-collapse"
                                className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full text-n-slate-11 bg-n-alpha-black2 hover:text-n-slate-12"
                                onClick={() => setExpanded(false)}
                            >
                                <Icon icon="i-lucide-minimize-2" className="size-3.5" />
                                {t('EMAIL_HEADER.COLLAPSE')}
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </section>
            {Array.isArray(attachments) && attachments.length ? (
                <section className="px-3 pb-3 space-y-2">
                    <AttachmentChips attachments={attachments} className="gap-1" />
                </section>
            ) : null}
        </BaseBubble>
    );
}
