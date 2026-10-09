/**
 * send-content.mjs — dựng tham số `message` cho `api.sendMessage` của zca-js từ
 * body Laravel gửi xuống (`POST /personal-messages/send`).
 *
 * Một chỗ duy nhất quyết định tin đi mang gì, cho CẢ nhánh chữ lẫn nhánh tệp:
 * - `quote` (SendMessageQuote do Laravel dựng từ `zca_message` của tin gốc) chỉ
 *   gắn khi là object có `msgId`. Nhánh tệp cũng gắn: có chú thích thì zca tự tách
 *   thành một tin chữ mang trích dẫn rồi gửi tệp; không chú thích thì zca bỏ
 *   trích dẫn (giới hạn của Zalo, `sendMessage.js` nhánh `msg.length > 0 && quote`).
 * - `mentions` chỉ gắn trong nhóm, lọc theo đúng chữ của nhánh (chú thích ở nhánh
 *   tệp). zca giữ nhắc tên ở chú thích ảnh đơn, còn lại tự tách chữ thành tin
 *   riêng vẫn mang nhắc tên.
 */
import { toZcaMentions } from './outbound-mentions.mjs';

function isSendableQuote(quote) {
    return quote !== null && typeof quote === 'object' && !Array.isArray(quote) && quote.msgId != null;
}

export function captionOf(text) {
    return text != null && String(text).trim() !== '' ? String(text) : '';
}

/**
 * @param {{ text?: unknown, quote?: unknown, attachmentPath?: string | null, mentions?: unknown, isGroup?: boolean }} input
 * @returns {{ msg: string, attachments?: string[], quote?: object, mentions?: { uid: string, pos: number, len: number }[] }}
 */
export function buildSendMessageContent({ text, quote, attachmentPath, mentions, isGroup = false } = {}) {
    const content = attachmentPath
        ? { msg: captionOf(text), attachments: [attachmentPath] }
        : { msg: String(text ?? '') };

    if (isSendableQuote(quote)) {
        content.quote = quote;
    }

    const zcaMentions = isGroup ? toZcaMentions(mentions, content.msg) : [];
    if (zcaMentions.length > 0) {
        content.mentions = zcaMentions;
    }

    return content;
}
