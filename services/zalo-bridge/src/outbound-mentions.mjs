/**
 * outbound-mentions.mjs — lọc danh sách nhắc tên Laravel gửi xuống thành `mentions`
 * hợp lệ cho `api.sendMessage` của zca-js.
 *
 * zca ném `ZaloApiError` (làm hỏng CẢ lượt gửi) khi tổng `len` vượt độ dài tin,
 * nên mục sai bị BỎ còn tin vẫn đi: `uid` rỗng, `pos`/`len` không phải số nguyên,
 * vượt quá chữ, hoặc chồng lên mục trước. `pos`/`len` là đơn vị UTF-16 (chỉ số
 * chuỗi JavaScript) — cùng đơn vị lõi đã neo.
 */

const MAX_MENTIONS = 50;

function toMention(raw, textLength) {
    if (raw === null || typeof raw !== 'object') {
        return null;
    }
    const uid = typeof raw.uid === 'string' ? raw.uid.trim() : '';
    const { pos, len } = raw;
    if (uid === '' || !Number.isInteger(pos) || !Number.isInteger(len) || pos < 0 || len <= 0 || pos + len > textLength) {
        return null;
    }
    return { uid, pos, len };
}

/**
 * @param {unknown} raw
 * @param {string} text
 * @returns {{ uid: string, pos: number, len: number }[]}
 */
export function toZcaMentions(raw, text) {
    if (!Array.isArray(raw) || typeof text !== 'string' || text === '') {
        return [];
    }

    const candidates = raw
        .map((item) => toMention(item, text.length))
        .filter(Boolean)
        .sort((a, b) => a.pos - b.pos);

    const mentions = [];
    for (const mention of candidates) {
        const previous = mentions[mentions.length - 1];
        if (previous && mention.pos < previous.pos + previous.len) {
            continue;
        }
        mentions.push(mention);
        if (mentions.length === MAX_MENTIONS) {
            break;
        }
    }
    return mentions;
}
