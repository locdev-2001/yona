import { t } from '../../../../i18n';
import BaseBubble from './Base';
import FormattedContent from './FormattedContent';
import { useMessageContext } from '../provider';

// Xem trước liên kết — năng lực `inbound_link_preview`
// (docs/channel-capabilities.md §2.1). Bong bóng đọc khoá TRUNG TÍNH
// `content_attributes.link_preview`, không biết kênh nào gửi: kênh nào chuẩn hoá
// vào khoá đó cũng dùng lại được bong bóng này.

export interface LinkPreview {
    url?: string | null;
    title?: string | null;
    description?: string | null;
    image?: string | null;
    source?: string | null;
}

/** Tên miền để hiện dưới thẻ; kênh không gửi `source` thì lấy từ chính URL. */
function hostOf(url: string, source?: string | null) {
    const declared = source?.trim();

    if (declared) {
        return declared;
    }

    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
}

/** URL rút gọn: bỏ scheme và `www.`, cắt phần đuôi quá dài. */
function shortenUrl(url: string) {
    const bare = url.replace(/^https?:\/\//i, '').replace(/^www\./, '');

    return bare.length > 64 ? `${bare.slice(0, 63)}…` : bare;
}

export default function LinkPreviewBubble() {
    const { contentAttributes, content } = useMessageContext();
    const preview = (contentAttributes.link_preview ?? {}) as LinkPreview;
    const url = preview.url?.trim() ?? '';

    if (!url) {
        return null;
    }

    const host = hostOf(url, preview.source);
    const title = preview.title?.trim() || host || t('CONVERSATION.LINK_PREVIEW.FALLBACK_TITLE');
    // `content` = chú thích khách gõ kèm; khi không có, driver để chính tiêu đề
    // hoặc URL ở đó — không lặp lại nó bên trên thẻ.
    const caption = content && content !== url && content !== preview.title ? content : '';

    return (
        <BaseBubble className="p-3" dataBubbleName="link-preview">
            {caption ? <FormattedContent content={caption} className="mb-2" /> : null}
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block max-w-[320px] overflow-hidden rounded-lg border border-n-container bg-n-solid-2"
                data-testid="link-preview-card"
            >
                {preview.image ? (
                    <img
                        src={preview.image}
                        alt=""
                        loading="lazy"
                        className="h-36 w-full object-cover"
                        data-testid="link-preview-image"
                    />
                ) : null}
                <div className="space-y-0.5 p-2.5">
                    <div className="truncate text-sm text-n-slate-12">{title}</div>
                    {preview.description ? (
                        <div className="line-clamp-2 text-sm text-n-slate-11">{preview.description}</div>
                    ) : null}
                    <div className="truncate text-xs text-n-slate-10">{host || shortenUrl(url)}</div>
                    <div className="truncate text-xs text-n-brand underline">{shortenUrl(url)}</div>
                </div>
            </a>
        </BaseBubble>
    );
}
