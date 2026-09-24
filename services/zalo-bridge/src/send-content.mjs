/**
 * send-content.mjs — dựng tham số `message` cho `api.sendMessage` của zca-js từ
 * body Laravel gửi xuống (`POST /personal-messages/send`).
 *
 * Một chỗ duy nhất quyết định tin đi mang gì, cho CẢ nhánh chữ lẫn nhánh tệp:
 * - `quote` (SendMessageQuote do Laravel dựng từ `zca_message` của tin gốc) chỉ
 *   gắn khi là object có `msgId`. Nhánh tệp cũng gắn: có chú thích thì zca tự tách
 *   thành một tin chữ mang trích dẫn rồi gửi tệp; không chú thích thì zca bỏ
 *   trích dẫn (giới hạn của Zalo, `sendMessage.js` nhánh `msg.length > 0 && quote`).
 */

function isSendableQuote(quote) {
    return quote !== null && typeof quote === 'object' && !Array.isArray(quote) && quote.msgId != null;
}

function captionOf(text) {
    return text != null && String(text).trim() !== '' ? String(text) : '';
}

/**
 * @param {{ text?: unknown, quote?: unknown, attachmentPath?: string | null }} input
 * @returns {{ msg: string, attachments?: string[], quote?: object }}
 */
export function buildSendMessageContent({ text, quote, attachmentPath } = {}) {
    const content = attachmentPath
        ? { msg: captionOf(text), attachments: [attachmentPath] }
        : { msg: String(text ?? '') };

    if (isSendableQuote(quote)) {
        content.quote = quote;
    }

    return content;
}
