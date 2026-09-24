/**
 * forward-content.mjs — chuyển tiếp gốc của Zalo cho tin chữ cùng một tài khoản.
 *
 * Laravel gửi `{ text, forward: { msg_id, ts } }` khi tin gốc nằm trong chính phiên
 * Zalo đang gửi. zca `forwardMessage` chỉ chuyển tiếp được chữ (msgType cứng "1"),
 * nên tệp/sticker không bao giờ đi đường này.
 *
 * Zalo từ chối lượt chuyển tiếp (lỗi API hoặc không có mục thành công) thì chưa có
 * gì được gửi → rơi về `sendMessage` với cùng nội dung, khách vẫn nhận tin. Lỗi
 * khác (mạng, timeout) có thể xảy ra sau khi Zalo đã nhận → ném tiếp để Laravel
 * đánh dấu thất bại, agent bấm Thử lại, tránh gửi hai lần.
 */
import { classifyZcaError } from './routes/personal-messages.mjs';
import { buildSendMessageContent } from './send-content.mjs';

// Chưa có tài liệu cho hai tham số này; giá trị chốt khi thử trên phiên Zalo thật.
export const FORWARD_LOG_SRC_TYPE = 1;
export const FORWARD_LEVEL = 1;

function positiveInteger(value) {
    const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
    return Number.isSafeInteger(number) && number > 0 ? number : null;
}

/**
 * @param {{ text?: unknown, forward?: unknown }} input
 * @returns {{ message: string, reference: { id: string, ts: number, logSrcType: number, fwLvl: number } } | null}
 */
export function buildForwardPayload({ text, forward } = {}) {
    const message = typeof text === 'string' ? text : '';
    if (message.trim() === '' || forward === null || typeof forward !== 'object') {
        return null;
    }
    const id = forward.msg_id != null ? String(forward.msg_id).trim() : '';
    const ts = positiveInteger(forward.ts);
    if (id === '' || ts === null) {
        return null;
    }
    return { message, reference: { id, ts, logSrcType: FORWARD_LOG_SRC_TYPE, fwLvl: FORWARD_LEVEL } };
}

/** `{ success: [{ msgId }], fail: [...] }` → danh sách msgId (chuỗi, bỏ rỗng). */
export function forwardedSourceIds(result) {
    const success = Array.isArray(result?.success) ? result.success : [];
    return success
        .map((entry) => (entry?.msgId != null ? String(entry.msgId) : ''))
        .filter((msgId) => msgId !== '');
}

/**
 * @param {{ forwardMessage: Function, sendMessage: Function }} api
 * @param {{ text: string, forward: unknown, threadId: string, threadType: number }} input
 * @returns {Promise<object>} kết quả `collectSourceIdsFromSendResult` đọc được
 */
export async function sendForwardOrFallback(api, { text, forward, threadId, threadType }) {
    const sendAsNewMessage = () => api.sendMessage(buildSendMessageContent({ text }), threadId, threadType);
    const payload = buildForwardPayload({ text, forward });
    if (payload === null) {
        return sendAsNewMessage();
    }

    let result;
    try {
        result = await api.forwardMessage(payload, [threadId], threadType);
    } catch (error) {
        if (classifyZcaError(error) !== 'zalo_rejected') {
            throw error;
        }
        console.warn('forwardMessage bị Zalo từ chối, gửi lại nội dung', error?.message ?? error);
        return sendAsNewMessage();
    }

    const [msgId] = forwardedSourceIds(result);
    return msgId ? { msgId } : sendAsNewMessage();
}
