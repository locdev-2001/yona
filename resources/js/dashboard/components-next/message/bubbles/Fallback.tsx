import { useState } from 'react';

import { EXTERNAL_LINK_PROPS } from 'shared/helpers/externalLinks';

import BaseBubble from './Base';
import FormattedContent from './FormattedContent';
import { useMessageContext } from '../provider';

const IMAGE_URL_PATTERN = /\.(jpe?g|png|webp|gif|avif)$/i;

function looksLikeImageUrl(url: string): boolean {
    try {
        return IMAGE_URL_PATTERN.test(new URL(url).pathname);
    } catch {
        return false;
    }
}

// Đính kèm chưa tải được về kho. Liên kết gốc là ảnh thì thử hiện ảnh thẳng từ nguồn,
// nguồn hỏng mới lùi về liên kết tên tệp.
export default function FallbackBubble() {
    const { attachments, content } = useMessageContext();
    const attachment = attachments[0];
    const url = attachment?.data_url ?? '';
    const title = attachment?.fallback_title || url;
    const [imageFailed, setImageFailed] = useState(false);
    const showImage = Boolean(url) && !imageFailed && looksLikeImageUrl(url);

    return (
        <BaseBubble className="p-3" dataBubbleName="fallback">
            {content ? <FormattedContent content={content} className="mb-2" /> : null}
            {showImage ? (
                <a href={url} {...EXTERNAL_LINK_PROPS} className="block">
                    <img
                        src={url}
                        alt={title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => setImageFailed(true)}
                        className="block max-h-80 max-w-full rounded-lg object-contain sm:max-w-[320px]"
                    />
                </a>
            ) : url ? (
                <a
                    href={url}
                    {...EXTERNAL_LINK_PROPS}
                    className="block max-w-[320px] truncate text-sm text-n-brand underline"
                >
                    {title}
                </a>
            ) : (
                <span className="text-sm text-n-slate-11">{title}</span>
            )}
        </BaseBubble>
    );
}
