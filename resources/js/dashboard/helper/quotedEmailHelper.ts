import { format, parseISO, isValid as isValidDate } from 'date-fns';
import DOMPurify from 'dompurify';

import type { ConversationMessage } from 'dashboard/conversation/types';

// Port từ dashboard/helper/quotedEmailHelper.js @ v4.17.1. Payload của Yona giữ
// snake_case nên các hàm đọc cả contentAttributes lẫn content_attributes như gốc.
type EmailBody = { full?: string; reply?: string; quoted?: string };

interface EmailMeta {
    from?: string[];
    to?: string[];
    date?: string;
    textContent?: EmailBody;
    text_content?: EmailBody;
    htmlContent?: EmailBody;
    html_content?: EmailBody;
}

export interface QuotableMessage {
    message_type?: number;
    content?: string | null;
    processed_message_content?: string | null;
    created_at?: number | string;
    private?: boolean;
    sender?: { name?: string | null; email?: string | null } | null;
    contentAttributes?: Record<string, unknown>;
    content_attributes?: Record<string, unknown>;
}

export interface QuotableContact {
    name?: string | null;
    email?: string | null;
}

export interface QuotableInbox {
    name?: string | null;
    email?: string | null;
}

const emailMetaOf = (lastEmail?: QuotableMessage | null): EmailMeta => {
    const contentAttributes = (lastEmail?.contentAttributes ??
        lastEmail?.content_attributes ??
        {}) as Record<string, unknown>;

    return (contentAttributes.email ?? {}) as EmailMeta;
};

/** Đổi HTML thành text thuần. */
export const extractPlainTextFromHtml = (html?: string | null): string => {
    if (!html) return '';
    if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, ' ');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = DOMPurify.sanitize(html);

    return tempDiv.textContent || tempDiv.innerText || '';
};

export const getEmailSenderName = (lastEmail?: QuotableMessage | null, contact?: QuotableContact | null): string => {
    const senderName = lastEmail?.sender?.name;
    if (senderName && senderName.trim()) return senderName.trim();

    const contactName = contact?.name;

    return contactName && contactName.trim() ? contactName.trim() : '';
};

export const getEmailSenderEmail = (
    lastEmail?: QuotableMessage | null,
    contact?: QuotableContact | null,
): string => {
    const senderEmail = lastEmail?.sender?.email;
    if (senderEmail && senderEmail.trim()) return senderEmail.trim();

    const emailMeta = emailMetaOf(lastEmail);
    if (Array.isArray(emailMeta.from) && emailMeta.from.length > 0) {
        const fromAddress = emailMeta.from[0];
        if (fromAddress && fromAddress.trim()) return fromAddress.trim();
    }

    const contactEmail = contact?.email;

    return contactEmail && contactEmail.trim() ? contactEmail.trim() : '';
};

export const getEmailDate = (lastEmail?: QuotableMessage | null): Date | null => {
    const emailMeta = emailMetaOf(lastEmail);

    if (emailMeta.date) {
        const parsedDate = parseISO(emailMeta.date);
        if (isValidDate(parsedDate)) return parsedDate;
    }

    const createdAt = lastEmail?.created_at;
    if (createdAt) {
        const timestamp = Number(createdAt);
        if (!Number.isNaN(timestamp)) {
            const milliseconds = timestamp > 1e12 ? timestamp : timestamp * 1000;
            const derivedDate = new Date(milliseconds);
            if (!Number.isNaN(derivedDate.getTime())) return derivedDate;
        }
    }

    return null;
};

export const formatQuotedEmailDate = (date: Date | string): string => {
    try {
        return format(date as Date, "EEE, MMM d, yyyy 'at' p");
    } catch {
        const fallbackDate = new Date(date);
        if (!Number.isNaN(fallbackDate.getTime())) {
            return format(fallbackDate, "EEE, MMM d, yyyy 'at' p");
        }
    }

    return '';
};

export const getInboxEmail = (lastEmail?: QuotableMessage | null, inbox?: QuotableInbox | null): string => {
    const emailMeta = emailMetaOf(lastEmail);

    if (Array.isArray(emailMeta.to) && emailMeta.to.length > 0) {
        const toAddress = emailMeta.to[0];
        if (toAddress && toAddress.trim()) return toAddress.trim();
    }

    const inboxEmail = inbox?.email;

    return inboxEmail && inboxEmail.trim() ? inboxEmail.trim() : '';
};

export const buildQuotedEmailHeaderFromContact = (
    lastEmail?: QuotableMessage | null,
    contact?: QuotableContact | null,
): string => {
    if (!lastEmail) return '';

    const quotedDate = getEmailDate(lastEmail);
    const senderEmail = getEmailSenderEmail(lastEmail, contact);
    if (!quotedDate || !senderEmail) return '';

    const formattedDate = formatQuotedEmailDate(quotedDate);
    if (!formattedDate) return '';

    const senderName = getEmailSenderName(lastEmail, contact);
    const contactLabel = senderName ? `${senderName} <${senderEmail}>` : `<${senderEmail}>`;

    return `On ${formattedDate} ${contactLabel} wrote:`;
};

export const buildQuotedEmailHeaderFromInbox = (
    lastEmail?: QuotableMessage | null,
    inbox?: QuotableInbox | null,
): string => {
    if (!lastEmail) return '';

    const quotedDate = getEmailDate(lastEmail);
    const inboxEmail = getInboxEmail(lastEmail, inbox);
    if (!quotedDate || !inboxEmail) return '';

    const formattedDate = formatQuotedEmailDate(quotedDate);
    if (!formattedDate) return '';

    const inboxName = inbox?.name;
    const inboxLabel = inboxName ? `${inboxName} <${inboxEmail}>` : `<${inboxEmail}>`;

    return `On ${formattedDate} ${inboxLabel} wrote:`;
};

export const buildQuotedEmailHeader = (
    lastEmail?: QuotableMessage | null,
    contact?: QuotableContact | null,
    inbox?: QuotableInbox | null,
): string => {
    if (!lastEmail) return '';

    // MESSAGE_TYPE.OUTGOING = 1, MESSAGE_TYPE.INCOMING = 0
    if (lastEmail.message_type === 1) return buildQuotedEmailHeaderFromInbox(lastEmail, inbox);

    return buildQuotedEmailHeaderFromContact(lastEmail, contact);
};

export const formatQuotedTextAsBlockquote = (text?: string | null, header = ''): string => {
    const normalizedLines = text ? String(text).replace(/\r\n/g, '\n').split('\n') : [];

    if (!header && !normalizedLines.length) return '';

    const quotedLines: string[] = [];

    if (header) {
        quotedLines.push(`> ${header}`);
        quotedLines.push('>');
    }

    normalizedLines.forEach(line => {
        const trimmedLine = line.trimEnd();
        quotedLines.push(trimmedLine ? `> ${trimmedLine}` : '>');
    });

    return quotedLines.join('\n');
};

export const extractQuotedEmailText = (lastEmail?: QuotableMessage | null): string => {
    if (!lastEmail) return '';

    const emailContent = emailMetaOf(lastEmail);
    const textContent = emailContent.textContent ?? emailContent.text_content;

    if (textContent?.reply) return textContent.reply;
    if (textContent?.full) return textContent.full;

    const htmlContent = emailContent.htmlContent ?? emailContent.html_content;
    if (htmlContent?.reply) return extractPlainTextFromHtml(htmlContent.reply);
    if (htmlContent?.full) return extractPlainTextFromHtml(htmlContent.full);

    return lastEmail.content || lastEmail.processed_message_content || '';
};

export const truncatePreviewText = (text: string, maxLength = 80): string => {
    const preview = text.trim().replace(/\s+/g, ' ');
    if (!preview) return '';
    if (preview.length <= maxLength) return preview;

    return `${preview.slice(0, maxLength - 3)}...`;
};

export const appendQuotedTextToMessage = (message: string, quotedText: string, header: string): string => {
    const baseMessage = message ? String(message) : '';
    const quotedBlock = formatQuotedTextAsBlockquote(quotedText, header);

    if (!quotedBlock) return baseMessage;
    if (!baseMessage) return quotedBlock;

    let separator = '\n\n';
    if (baseMessage.endsWith('\n\n')) separator = '';
    else if (baseMessage.endsWith('\n')) separator = '\n';

    return `${baseMessage}${separator}${quotedBlock}`;
};

export type { ConversationMessage };
