import DOMPurify from 'dompurify';

import MessageFormatter from './MessageFormatter';

// Chỗ DUY NHẤT quyết định cách mở liên kết trong nội dung tin: luôn sang tab mới
// và không cho trang đích chạm ngược vào cửa sổ hộp thư. Liên kết dựng bằng JSX
// trải `EXTERNAL_LINK_PROPS`, HTML dựng sẵn (markdown, thư HTML) đi qua
// `sanitizeMessageHtml` hoặc `withExternalLinkTargets`.

export const EXTERNAL_LINK_PROPS = {
    target: '_blank',
    rel: 'noopener noreferrer nofollow',
} as const;

const ANCHOR_SELECTOR = 'a[href]';

function markExternalLink(anchor: Element): void {
    anchor.setAttribute('target', EXTERNAL_LINK_PROPS.target);
    anchor.setAttribute('rel', EXTERNAL_LINK_PROPS.rel);
}

// Bản DOMPurify riêng: hook chỉ áp cho nội dung tin, không đổi hành vi của các chỗ
// khác đang dùng bản mặc định.
const messagePurifier = DOMPurify(window);

messagePurifier.addHook('afterSanitizeAttributes', node => {
    if (node instanceof Element && node.matches(ANCHOR_SELECTOR)) {
        markExternalLink(node);
    }
});

/** Lọc HTML nội dung tin và đặt mọi liên kết mở tab mới. */
export function sanitizeMessageHtml(html: string): string {
    return messagePurifier.sanitize(html);
}

/** Markdown của tin → HTML đã lọc, URL trần thành liên kết mở tab mới. */
export function messageMarkdownHtml(content: string | null | undefined, linkify = true): string {
    return sanitizeMessageHtml(new MessageFormatter(content, linkify).formattedMessage);
}

/** Đặt mọi liên kết của HTML ĐÃ lọc bằng bộ lọc khác (thư HTML) mở tab mới. */
export function withExternalLinkTargets(sanitizedHtml: string): string {
    const template = document.createElement('template');
    template.innerHTML = sanitizedHtml;
    template.content.querySelectorAll(ANCHOR_SELECTOR).forEach(markExternalLink);

    return template.innerHTML;
}
