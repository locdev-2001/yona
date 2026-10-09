import { EXTERNAL_LINK_PROPS } from 'shared/helpers/externalLinks';

import BaseBubble from './Base';
import FormattedContent from './FormattedContent';
import { useMessageContext } from '../provider';

// Port từ dashboard/components-next/message/bubbles/Fallback.vue.
export default function FallbackBubble() {
    const { attachments, content } = useMessageContext();
    const attachment = attachments[0];
    const url = attachment?.data_url ?? '';
    const title = attachment?.fallback_title || url;

    return (
        <BaseBubble className="p-3" dataBubbleName="fallback">
            {content ? <FormattedContent content={content} className="mb-2" /> : null}
            {url ? (
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
