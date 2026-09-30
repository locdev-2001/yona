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

// Ghi cả chữ trơn lẫn HTML: nơi nhận HTML (email, docs) giữ link bấm được, nơi khác dán chữ trơn.
export async function copyRichTextToClipboard(text: string, html: string): Promise<void> {
    if (typeof ClipboardItem === 'undefined') {
        await copyTextToClipboard(text);
        return;
    }
    await navigator.clipboard.write([
        new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
        }),
    ]);
}

// Trình duyệt chỉ nhận image/png trong ClipboardItem, nên ảnh jpg/webp phải qua canvas.
export async function copyImageToClipboard(url: string): Promise<void> {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) throw new Error(`Không tải được ảnh (${response.status})`);
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    bitmap.close();
    const png = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!png) throw new Error('Không chuyển được ảnh sang PNG');
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
