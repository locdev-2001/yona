import { messageMarkdownHtml, sanitizeMessageHtml } from 'shared/helpers/externalLinks';

import { useMessageContext } from '../provider';
import { MESSAGE_VARIANTS } from '../constants';
import { useInnerHtml } from '../helpers/useInnerHtml';

// Port từ dashboard/components-next/message/bubbles/Text/FormattedContent.vue.
export default function FormattedContent({ content, className = '' }: { content: string; className?: string }) {
    const { variant } = useMessageContext();

    const innerHtml = useInnerHtml(
        variant === MESSAGE_VARIANTS.ACTIVITY ? sanitizeMessageHtml(content) : messageMarkdownHtml(content),
    );

    return (
        <span
            className={`prose prose-bubble ${className}`.trim()}
            dangerouslySetInnerHTML={innerHtml}
        />
    );
}
