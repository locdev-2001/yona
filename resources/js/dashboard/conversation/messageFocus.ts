// Tham số trên URL trỏ tới một tin trong cuộc trò chuyện (liên kết "sao chép link tin").
export const FOCUS_MESSAGE_PARAM = 'messageId';

export function readFocusMessageId(search: string): number | null {
    const raw = new URLSearchParams(search).get(FOCUS_MESSAGE_PARAM);
    if (raw === null || !/^\d+$/.test(raw)) return null;

    const id = Number(raw);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
