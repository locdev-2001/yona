import { t } from '../../../../i18n';
import BaseBubble from './Base';
import FormattedContent from './FormattedContent';
import AttachmentChips from '../chips/AttachmentChips';
import { useMessageContext } from '../provider';

// Port từ bubbles/Text/Index.vue — bỏ TranslationToggle (EE) và
// submittedEmail (template email, F1).

export default function TextBubble() {
    const { content, attachments } = useMessageContext();

    const isEmpty = !content && !attachments?.length;

    return (
        <BaseBubble className="px-4 py-3" dataBubbleName="text">
            <div className="gap-3 flex flex-col">
                {isEmpty && <span className="text-n-slate-11">{t('CONVERSATION.NO_CONTENT')}</span>}
                {content && <FormattedContent content={content} />}
                <AttachmentChips attachments={attachments} className="gap-2" />
            </div>
        </BaseBubble>
    );
}
