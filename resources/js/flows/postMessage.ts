// Hợp đồng cố định với Sheet của widget (phase-05 §C): trang chạy trong iframe
// báo kết quả bằng postMessage tiền tố `yona-flow:`, target origin là CHÍNH
// origin của trang này (Sheet mở từ cùng domain Yona, không phải domain tenant).
// Widget chỉ nhận tin nhắn đúng tiền tố này và đúng origin — không dùng '*'.
export const isEmbedded = (): boolean => typeof window !== 'undefined' && window.self !== window.top;

function post(message: { type: string; message_id?: number }): void {
    if (!isEmbedded()) return;
    window.parent.postMessage(message, window.location.origin);
}

export function notifySubmitted(messageId: number): void {
    post({ type: 'yona-flow:submitted', message_id: messageId });
}

export function notifyClose(): void {
    post({ type: 'yona-flow:close' });
}
