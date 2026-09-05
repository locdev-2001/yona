import DOMPurify from 'dompurify';

import MessageFormatter from 'shared/helpers/MessageFormatter';

import { useMessageContext } from '../provider';
import { MESSAGE_VARIANTS } from '../constants';

// Port từ dashboard/components-next/message/bubbles/Text/FormattedContent.vue.
export default function FormattedContent({ content, className = '' }: { content: string; className?: string }) {
    const { variant } = useMessageContext();

    const formattedContent =
        variant === MESSAGE_VARIANTS.ACTIVITY ? content : new MessageFormatter(content).formattedMessage;

    return (
        <span
            className={`prose prose-bubble ${className}`.trim()}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedContent) }}
        />
    );
}
