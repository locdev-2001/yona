import { t } from '../../../../i18n';
import BaseBubble from './Base';
import FormattedContent from './FormattedContent';
import AttachmentChips from '../chips/AttachmentChips';
import { useMessageContext } from '../provider';
import { emphasizeMentions, readGroupMentions } from '../helpers/groupSender';

// Port từ bubbles/Text/Index.vue — bỏ TranslationToggle (EE) và
// submittedEmail (template email, F1).

export default function TextBubble() {
    const { content, attachments, contentAttributes } = useMessageContext();

    const isEmpty = !content && !attachments?.length;
    // Nhắc tên trong nhóm phải nổi lên như ở app gốc của kênh.
    const displayContent = content ? emphasizeMentions(content, readGroupMentions(contentAttributes)) : content;

    return (
        <BaseBubble className="px-4 py-3" dataBubbleName="text">
            <div className="gap-3 flex flex-col">
                {isEmpty && <span className="text-n-slate-11">{t('CONVERSATION.NO_CONTENT')}</span>}
                {displayContent && <FormattedContent content={displayContent} />}
                <AttachmentChips attachments={attachments} className="gap-2" />
            </div>
        </BaseBubble>
    );
}
