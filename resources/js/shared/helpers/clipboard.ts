// Port từ shared/helpers/clipboard.js (bỏ fallback execCommand đã deprecated —
// app chỉ chạy trên trình duyệt có navigator.clipboard).
export async function copyTextToClipboard(text: string): Promise<void> {
    await navigator.clipboard.writeText(text);
}

// Port từ shared/helpers/clipboard.js — chỉ nhận dãy số đúng độ dài của mã OTP.
export function handleOtpPaste(event: React.ClipboardEvent, maxLength = 6): string | null {
    const pasted = event.clipboardData
        ?.getData('text')
        .replace(/\D/g, '')
        .slice(0, maxLength);

    return pasted && pasted.length === maxLength ? pasted : null;
}
