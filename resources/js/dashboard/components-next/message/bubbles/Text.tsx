import { isJumboEmoji } from 'shared/helpers/jumboEmoji';
import { t } from '../../../../i18n';
import BaseBubble from './Base';
import FormattedContent from './FormattedContent';
import AttachmentChips from '../chips/AttachmentChips';
import MediaBubble from './Media';
import { groupAttachmentChips } from '../helpers/attachments';
import { useMessageContext } from '../provider';
import { MESSAGE_VARIANTS } from '../constants';
import { emphasizeMentions, readGroupMentions } from '../helpers/groupSender';

// Port từ bubbles/Text/Index.vue — bỏ TranslationToggle (EE) và
// submittedEmail (template email, F1).

// Chỉ tin thường của khách và nhân viên; ghi chú riêng, bot, tin lỗi giữ khung màu riêng.
const JUMBO_EMOJI_VARIANTS: string[] = [MESSAGE_VARIANTS.USER, MESSAGE_VARIANTS.AGENT];

export default function TextBubble() {
    const { content, attachments, contentAttributes, variant, replyQuote } = useMessageContext();

    const isJumbo =
        JUMBO_EMOJI_VARIANTS.includes(variant) && !attachments?.length && !replyQuote && isJumboEmoji(content);

    if (isJumbo) {
        return (
            <BaseBubble className="!bg-transparent !p-0" dataBubbleName="text">
                <span data-jumbo-emoji className="block text-4xl leading-tight">
                    {content?.trim()}
                </span>
            </BaseBubble>
        );
    }

    if (groupAttachmentChips(attachments).media.length) {
        return <MediaBubble dataBubbleName="text" />;
    }

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
