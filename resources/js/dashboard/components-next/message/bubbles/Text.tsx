import DOMPurify from 'dompurify';

import MessageFormatter from 'shared/helpers/MessageFormatter';
import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';
import { MESSAGE_VARIANTS } from '../constants';

// Port từ bubbles/Text/Index.vue + Text/FormattedContent.vue — bỏ ở B3:
// TranslationToggle (EE), AttachmentChips (B9), submittedEmail (template email).

function FormattedContent({ content }: { content: string }) {
    const { variant } = useMessageContext();

    const formattedContent =
        variant === MESSAGE_VARIANTS.ACTIVITY ? content : new MessageFormatter(content).formattedMessage;

    return (
        <span
            className="prose prose-bubble"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formattedContent) }}
        />
    );
}

export default function TextBubble() {
    const { content, attachments } = useMessageContext();

    const isEmpty = !content && !attachments?.length;

    return (
        <BaseBubble className="px-4 py-3" dataBubbleName="text">
            <div className="gap-3 flex flex-col">
                {isEmpty && <span className="text-n-slate-11">{t('CONVERSATION.NO_CONTENT')}</span>}
                {content && <FormattedContent content={content} />}
            </div>
        </BaseBubble>
    );
}
