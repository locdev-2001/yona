import { useEffect, useMemo, useRef, useState } from 'react';
import { sanitizeTextForRender } from '@ext/utils';
import { allowedCssProperties } from 'lettersanitizer';

import { t } from '../../../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import { EmailQuoteExtractor } from 'dashboard/helper/emailQuoteExtractor';
import BaseBubble from '../Base';
import FormattedContent from '../FormattedContent';
import AttachmentChips from '../../chips/AttachmentChips';
import EmailMeta from './EmailMeta';
import Letter from './Letter';
import { useMessageContext } from '../../provider';
import { MESSAGE_TYPES } from '../../constants';
import './Index.scss';

// Port từ components-next/message/bubbles/Email/Index.vue — bỏ TranslationToggle
// (cùng nhánh EE như bubble Text). content_attributes của Yona giữ snake_case.
type EmailBody = { full?: string; reply?: string; quoted?: string };

const ALLOWED_CSS_PROPERTIES = [...allowedCssProperties, 'transform', 'transform-origin'];

export default function EmailBubble() {
    const { content, contentAttributes, attachments, messageType } = useMessageContext();

    const [isExpandable, setExpandable] = useState(false);
    const [isExpanded, setExpanded] = useState(false);
    const [showQuotedMessage, setShowQuotedMessage] = useState(false);
    const contentContainer = useRef<HTMLElement>(null);

    useEffect(() => {
        setExpandable((contentContainer.current?.scrollHeight ?? 0) > 400);
    }, []);

    const isOutgoing = messageType === MESSAGE_TYPES.OUTGOING;
    const isIncoming = !isOutgoing;

    const email = (contentAttributes.email ?? {}) as {
        text_content?: EmailBody;
        html_content?: EmailBody;
    };
    const textContentFull = email.text_content?.full;
    const htmlContentFull = email.html_content?.full;

    const originalEmailText = sanitizeTextForRender(textContentFull ?? content ?? '');
    const originalEmailHtml = htmlContentFull || originalEmailText;
    const hasEmailContent = Boolean(textContentFull || htmlContentFull);

    const unquotedHTML = useMemo(() => EmailQuoteExtractor.extractQuotes(originalEmailHtml), [originalEmailHtml]);
    const hasQuotedMessage = useMemo(() => EmailQuoteExtractor.hasQuotes(originalEmailHtml), [originalEmailHtml]);

    return (
        <BaseBubble
            className={`w-full ${isIncoming ? 'bg-n-slate-4' : 'bg-n-solid-blue'}`}
            dataBubbleName="email"
        >
            <EmailMeta
                className={`p-3 ${isIncoming ? 'border-b border-n-strong' : 'border-b border-n-slate-8/20'}`}
            />
            <section ref={contentContainer} className="p-3">
                <div
                    className={
                        !isExpanded && isExpandable
                            ? 'max-h-[400px] overflow-hidden relative'
                            : isExpanded
                              ? 'overflow-y-scroll relative'
                              : ''
                    }
                >
                    {isExpandable && !isExpanded ? (
                        <div
                            className={`absolute left-0 right-0 bottom-0 h-40 px-8 flex items-end ${
                                isIncoming
                                    ? 'bg-gradient-to-t from-n-slate-4 via-n-slate-4 via-20% to-transparent'
                                    : 'bg-gradient-to-t from-n-solid-blue via-n-solid-blue via-20% to-transparent'
                            }`}
                        >
                            <button
                                className="text-n-slate-12 py-2 px-8 mx-auto text-center flex items-center gap-2"
                                onClick={() => setExpanded(true)}
                            >
                                <Icon icon="i-lucide-maximize-2" />
                                {t('EMAIL_HEADER.EXPAND')}
                            </button>
                        </div>
                    ) : null}

                    {isOutgoing && content && !hasEmailContent ? (
                        <FormattedContent className="text-n-slate-12" content={content} />
                    ) : (
                        <Letter
                            className="prose prose-bubble !max-w-none letter-render"
                            allowedCssProperties={ALLOWED_CSS_PROPERTIES}
                            html={showQuotedMessage ? originalEmailHtml : unquotedHTML}
                            text={originalEmailText}
                        />
                    )}

                    {hasQuotedMessage ? (
                        <button
                            className="text-n-slate-11 px-1 leading-none text-sm bg-n-alpha-black2 text-center flex items-center gap-1 mt-2"
                            onClick={() => setShowQuotedMessage(current => !current)}
                        >
                            {showQuotedMessage ? t('CHAT_LIST.HIDE_QUOTED_TEXT') : t('CHAT_LIST.SHOW_QUOTED_TEXT')}
                            <Icon icon={showQuotedMessage ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'} />
                        </button>
                    ) : null}
                </div>
            </section>
            {Array.isArray(attachments) && attachments.length ? (
                <section className="px-4 pb-4 space-y-2">
                    <AttachmentChips attachments={attachments} className="gap-1" />
                </section>
            ) : null}
        </BaseBubble>
    );
}
