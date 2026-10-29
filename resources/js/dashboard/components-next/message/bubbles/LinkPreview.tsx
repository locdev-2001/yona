import { EXTERNAL_LINK_PROPS } from 'shared/helpers/externalLinks';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import FormattedContent from './FormattedContent';
import { useMessageContext } from '../provider';
import { ORIENTATION } from '../constants';
import { linkPreviewParts, type LinkPreview, type LinkPreviewParts } from '../helpers/linkPreview';

// Xem trước liên kết — năng lực `inbound_link_preview`
// (docs/channel-capabilities.md §2.1). Chữ khách gõ kèm liên kết là bong bóng chữ
// đầy đủ, thẻ đứng riêng bên dưới; tin chỉ có liên kết thì chỉ có thẻ.

function LinkPreviewCard({ parts, preview }: { parts: LinkPreviewParts; preview: LinkPreview }) {
    return (
        <a
            href={parts.url}
            {...EXTERNAL_LINK_PROPS}
            className="block w-80 max-w-full overflow-hidden rounded-lg border border-n-container bg-n-solid-2"
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
                <div className="truncate text-sm text-n-slate-12" data-testid="link-preview-title">
                    {parts.title || parts.host || t('CONVERSATION.LINK_PREVIEW.FALLBACK_TITLE')}
                </div>
                {preview.description ? (
                    <div className="line-clamp-2 text-sm text-n-slate-11">{preview.description}</div>
                ) : null}
                <div className="truncate text-xs text-n-slate-10">{parts.host || parts.shortUrl}</div>
                <div className="truncate text-xs text-n-brand underline">{parts.shortUrl}</div>
            </div>
        </a>
    );
}

export default function LinkPreviewBubble() {
    const { contentAttributes, content, orientation } = useMessageContext();
    const preview = (contentAttributes.link_preview ?? {}) as LinkPreview;
    const parts = linkPreviewParts(content, preview);

    if (!parts) {
        return null;
    }

    if (!parts.caption) {
        return (
            <BaseBubble className="p-3" dataBubbleName="link-preview">
                <LinkPreviewCard parts={parts} preview={preview} />
            </BaseBubble>
        );
    }

    return (
        <div
            className={`flex flex-col gap-1 min-w-0 ${orientation === ORIENTATION.RIGHT ? 'items-end' : 'items-start'}`}
            data-bubble-name="link-preview"
        >
            <BaseBubble className="px-4 py-3" dataBubbleName="text">
                <FormattedContent content={parts.caption} />
            </BaseBubble>
            <LinkPreviewCard parts={parts} preview={preview} />
        </div>
    );
}
