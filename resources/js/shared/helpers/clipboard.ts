// Port từ shared/helpers/clipboard.js (bỏ fallback execCommand đã deprecated —
// app chỉ chạy trên trình duyệt có navigator.clipboard).
export async function copyTextToClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
}
