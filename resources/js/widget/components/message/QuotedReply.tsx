import { t } from '../../i18n';
import { MESSAGE_TYPE } from '../../helpers/constants';
import { isDeletedMessage } from '../../helpers/messageHelpers';
import type { WidgetMessage } from '../../types';

const HIGHLIGHT_DURATION = 900;

export const messageElementId = (messageId: number | string): string => `yona-msg-${messageId}`;

export function scrollToMessage(messageId: number | string): void {
    const element = document.getElementById(messageElementId(messageId));
    if (!element) return;
    element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    element.classList.add('yona-chat-highlight');
    setTimeout(() => element.classList.remove('yona-chat-highlight'), HIGHLIGHT_DURATION);
}

// Khối trích dẫn nằm BÊN TRONG bong bóng tin trả lời: vạch màu, tên người gửi,
// một dòng nội dung; bấm vào nhảy tới tin gốc.
export default function QuotedReply({ replyTo, isOwn }: { replyTo: WidgetMessage; isOwn: boolean }) {
    const isReplyToOwnMessage = replyTo.message_type === MESSAGE_TYPE.INCOMING;
    const senderName = isReplyToOwnMessage
        ? t('REPLY.YOU')
        : (replyTo.sender?.available_name ?? replyTo.sender?.name ?? replyTo.additional_attributes?.sender_name ?? '');
    const excerpt = isDeletedMessage(replyTo)
        ? t('RECALL.BY_THEM')
        : replyTo.content ||
          (replyTo.attachments?.length ? t(`ATTACHMENTS.${replyTo.attachments[0].file_type}.CONTENT`) : '');

    return (
        <button
            type="button"
            title={t('REPLY.JUMP_TO_ORIGINAL')}
            className={`yona-quoted-reply block w-full min-w-0 rounded-[9px] px-[10px] py-2 text-start ltr:border-l-[3px] rtl:border-r-[3px] ${
                isOwn
                    ? 'border-[var(--yona-chat-quote-line-own)] bg-[var(--yona-chat-quote-own)]'
                    : 'border-[var(--yona-chat-accent)] bg-[var(--yona-chat-field)]'
            }`}
            onClick={() => scrollToMessage(replyTo.id)}
        >
            {senderName ? (
                <span
                    className={`mb-[2px] block text-[11px] font-semibold leading-[1.3] ${
                        isOwn ? 'text-[var(--yona-chat-quote-name-own)]' : 'text-[var(--yona-chat-accent-ink)]'
                    }`}
                >
                    {senderName}
                </span>
            ) : null}
            <span
                className={`block truncate text-[12px] leading-[1.4] ${
                    isOwn ? 'text-[var(--yona-chat-on-solid-soft)]' : 'text-[var(--yona-chat-ink-soft)]'
                }`}
            >
                {excerpt}
            </span>
        </button>
    );
}
