// Luật dàn trang thân thư thuần (không DOM) để bong bóng email và test dùng chung.

// Thư HTML hiện trong iframe sandbox KHÔNG có allow-scripts: script trong thư không
// chạy dù có lọt qua bộ lọc. allow-same-origin chỉ để trang đo được chiều cao thư;
// liên kết mở tab mới ngoài sandbox.
export const EMAIL_FRAME_SANDBOX = 'allow-same-origin allow-popups allow-popups-to-escape-sandbox';
export const EMAIL_FRAME_ROOT_ID = 'email-root';

// CSS mặc định của trình duyệt là thứ thư HTML được soạn cho; chỉ thêm nền trắng,
// phông hệ thống và lề đọc được cho thư không tự có lề.
const EMAIL_FRAME_BASE_CSS = [
    'html,body{margin:0;padding:0;background:#fff;color:#1f2328}',
    'html{overflow-y:hidden;overflow-x:auto}',
    'body{font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:14px;line-height:1.45;overflow-wrap:break-word}',
    `#${EMAIL_FRAME_ROOT_ID}{padding:12px 14px;box-sizing:border-box}`,
    'a{color:#1a73e8}',
].join('');

/** Tài liệu HTML đầy đủ cho iframe thân thư, từ HTML ĐÃ lọc. */
export function buildEmailFrameDocument(sanitizedHtml: string): string {
    return (
        '<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank">' +
        `<style>${EMAIL_FRAME_BASE_CSS}</style></head>` +
        `<body><div id="${EMAIL_FRAME_ROOT_ID}">${sanitizedHtml}</div></body></html>`
    );
}

// Thân thư cao hơn ngưỡng này thì thu gọn còn COLLAPSED_BODY_HEIGHT kèm nút mở rộng.
// Có khoảng chênh để thư chỉ dài hơn một chút không bị cắt mất vài dòng cuối.
export const COLLAPSED_BODY_HEIGHT = 400;
export const COLLAPSE_THRESHOLD = 520;

// Thư thiết kế cứng 600px trong khung chat hẹp được thu nhỏ cho vừa, như ứng dụng
// thư trên điện thoại (thư 600px vừa cả khung 180px). Thư còn rộng hơn mức này thì
// chữ không đọc nổi nên giữ mức này và cuộn ngang phần dư.
export const MIN_FIT_SCALE = 0.3;

/** Tỉ lệ thu nhỏ để thư rộng contentWidth vừa khung rộng containerWidth (1 = giữ nguyên). */
export function fitEmailToWidth(contentWidth: number, containerWidth: number): number {
    // Sai số 1px do làm tròn subpixel không đáng để thu nhỏ cả thư.
    if (containerWidth <= 0 || contentWidth <= containerWidth + 1) return 1;

    return Math.max(MIN_FIT_SCALE, Math.floor((containerWidth / contentWidth) * 1000) / 1000);
}

export function isBodyCollapsible(bodyHeight: number): boolean {
    return bodyHeight > COLLAPSE_THRESHOLD;
}

export interface PlainTextParts {
    reply: string;
    quoted: string | null;
}

// Dòng mở đầu phần trích dẫn của các ứng dụng thư phổ biến (Gmail, Outlook, Apple Mail)
// bằng tiếng Anh và tiếng Việt.
const QUOTE_HEADER_PATTERNS = [
    /^On\b.*\bwrote:\s*$/i,
    /^Vào\s.*\sđã viết:\s*$/i,
    /^-{2,}\s*Original Message\s*-{2,}\s*$/i,
    /^-{2,}\s*Thư gốc\s*-{2,}\s*$/i,
];
// Gmail ngắt dòng mở đầu dài thành hai dòng ("On …" / "<địa chỉ> wrote:").
const QUOTE_HEADER_MAX_LINES = 3;

function quoteHeaderStart(lines: string[]): number {
    for (let index = 0; index < lines.length; index++) {
        for (let span = 1; span <= QUOTE_HEADER_MAX_LINES && index + span <= lines.length; span++) {
            const candidate = lines
                .slice(index, index + span)
                .map(line => line.trim())
                .join(' ');
            if (QUOTE_HEADER_PATTERNS.some(pattern => pattern.test(candidate))) return index;
        }
    }

    return -1;
}

// Khối dòng ">" liền nhau ở cuối thư (bỏ qua dòng trống cuối).
function trailingQuoteStart(lines: string[]): number {
    let index = lines.length - 1;
    while (index >= 0 && lines[index].trim() === '') index--;
    if (index < 0 || !lines[index].trimStart().startsWith('>')) return -1;
    while (index > 0 && lines[index - 1].trimStart().startsWith('>')) index--;

    return index;
}

/** Tách thư văn bản thuần thành phần trả lời mới và phần trích dẫn thư cũ. */
export function splitPlainTextQuote(text: string): PlainTextParts {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const headerStart = quoteHeaderStart(lines);
    const quoteStart = headerStart >= 0 ? headerStart : trailingQuoteStart(lines);
    const reply = quoteStart > 0 ? lines.slice(0, quoteStart).join('\n').trimEnd() : '';

    // Không có gì đứng trước trích dẫn thì cả thư là nội dung, không giấu đi đâu.
    if (quoteStart <= 0 || reply.trim() === '') {
        return { reply: text.trimEnd(), quoted: null };
    }

    return { reply, quoted: lines.slice(quoteStart).join('\n').trimEnd() };
}
