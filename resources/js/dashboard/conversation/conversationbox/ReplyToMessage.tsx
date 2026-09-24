import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import MessagePreview from 'dashboard/components/widgets/conversation/MessagePreview';

import { t } from '../../../i18n';
import type { ConversationMessage } from '../types';

// Khối "Đang trả lời: …" đầu khung soạn khi agent bấm Trả lời trên một bong bóng.
interface ReplyToMessageProps {
    message: ConversationMessage;
    onDismiss: () => void;
}

export default function ReplyToMessage({ message, onDismiss }: ReplyToMessageProps) {
    return (
        <div
            data-testid="reply-to-message"
            className="bg-n-slate-9/10 rounded-md py-1 ps-2 pe-1 text-xs mt-2 flex items-center gap-1.5 min-w-0"
        >
            <Icon icon="i-lucide-reply" className="size-3.5 shrink-0 text-n-slate-11" />
            <span className="shrink-0 text-n-slate-11">{t('CONVERSATION.REPLYBOX.REPLYING_TO')}</span>
            <MessagePreview
                message={message}
                showMessageType={false}
                defaultEmptyMessage={t('CONVERSATION.REPLY_MESSAGE_NOT_FOUND')}
                className="flex-1 min-w-0 text-n-slate-12"
            />
            <Button
                title={t('CONVERSATION.REPLYBOX.DISMISS_REPLY')}
                aria-label={t('CONVERSATION.REPLYBOX.DISMISS_REPLY')}
                ghost
                slate
                xs
                icon="i-lucide-x"
                className="shrink-0"
                onClick={onDismiss}
            />
        </div>
    );
}
