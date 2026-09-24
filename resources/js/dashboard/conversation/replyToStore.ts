// Tin đang được trả lời trích dẫn, lưu theo từng hội thoại trong localStorage
// (cùng cách giữ bản nháp ở draftApi.ts) để reload vẫn còn. Đọc lại mỗi lần gọi
// để hai tab cùng mở không ghi đè dữ liệu của nhau bằng bản cũ trong bộ nhớ.

const REPLY_TO_STORE = 'messageReplyTo';

type ReplyTargetRecords = Record<string, number>;

function readStore(): ReplyTargetRecords {
    try {
        const raw = window.localStorage.getItem(REPLY_TO_STORE);
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as ReplyTargetRecords) : {};
    } catch {
        return {};
    }
}

function writeStore(records: ReplyTargetRecords): void {
    try {
        window.localStorage.setItem(REPLY_TO_STORE, JSON.stringify(records));
    } catch {
        /* hết dung lượng hoặc bị chặn — mất trạng thái khi reload, không làm hỏng việc soạn */
    }
}

export function getReplyTarget(conversationId: number): number | null {
    const messageId = Number(readStore()[String(conversationId)]);

    return Number.isInteger(messageId) && messageId > 0 ? messageId : null;
}

export function setReplyTarget(conversationId: number, messageId: number): void {
    writeStore({ ...readStore(), [String(conversationId)]: messageId });
}

export function removeReplyTarget(conversationId: number): void {
    const records = readStore();
    const key = String(conversationId);
    if (!(key in records)) return;

    const { [key]: _removed, ...rest } = records;
    writeStore(rest);
}
