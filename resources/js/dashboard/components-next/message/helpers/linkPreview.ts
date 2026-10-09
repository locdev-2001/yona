// Thẻ xem trước liên kết đọc khoá TRUNG TÍNH `content_attributes.link_preview`
// (docs/channel-capabilities.md §2.1). Luật tách chữ khách gõ khỏi thẻ nằm ở đây
// để bong bóng không phải biết kênh nào gửi.

export interface LinkPreview {
    url?: string | null;
    title?: string | null;
    description?: string | null;
    image?: string | null;
    source?: string | null;
}

export interface LinkPreviewParts {
    url: string;
    /** Chữ khách gõ kèm liên kết, hiện thành bong bóng chữ riêng; rỗng = tin chỉ có liên kết. */
    caption: string;
    /** Tiêu đề trang; null khi kênh không có tiêu đề thật (trùng URL hoặc trùng chữ khách). */
    title: string | null;
    host: string;
    shortUrl: string;
}

const SHORT_URL_MAX_LENGTH = 64;
const SINGLE_URL_PATTERN = /^(?:https?:\/\/|www\.)\S+$/i;

/** Tên miền để hiện dưới thẻ; kênh không gửi `source` thì lấy từ chính URL. */
function hostOf(url: string, source?: string | null): string {
    const declared = source?.trim();

    if (declared) return declared;

    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

/** URL rút gọn: bỏ scheme và `www.`, cắt phần đuôi quá dài. */
function shortenUrl(url: string): string {
    const bare = url.replace(/^https?:\/\//i, '').replace(/^www\./, '');

    return bare.length > SHORT_URL_MAX_LENGTH ? `${bare.slice(0, SHORT_URL_MAX_LENGTH - 1)}…` : bare;
}

/**
 * Chữ khách gõ là `content` khi nó khác liên kết trần. Có kênh nhét nguyên câu
 * khách gõ vào tiêu đề thẻ, có kênh để tiêu đề trang vào `content` khi khách
 * không gõ gì: chữ chứa chính liên kết là chữ khách gõ, chữ trùng tiêu đề mà
 * không chứa liên kết là tiêu đề trang.
 */
function captionOf(content: string, url: string, title: string): string {
    if (content === '' || content === url || SINGLE_URL_PATTERN.test(content)) return '';
    if (content === title && !content.includes(url)) return '';

    return content;
}

export function linkPreviewParts(content: string | null | undefined, preview: LinkPreview): LinkPreviewParts | null {
    const url = preview.url?.trim() ?? '';

    if (!url) return null;

    const rawTitle = preview.title?.trim() ?? '';
    const caption = captionOf(content?.trim() ?? '', url, rawTitle);
    const isRealTitle = rawTitle !== '' && rawTitle !== caption && !rawTitle.includes(url);

    return {
        url,
        caption,
        title: isRealTitle ? rawTitle : null,
        host: hostOf(url, preview.source),
        shortUrl: shortenUrl(url),
    };
}
