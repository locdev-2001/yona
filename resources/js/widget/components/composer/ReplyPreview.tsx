import { MESSAGE_TYPE } from '../../helpers/constants';
import { t } from '../../i18n';
import type { WidgetMessage } from '../../types';

// Khối "đang trả lời" nằm trên ô nhập: vạch accent, tên người + một dòng trích.
export default function ReplyPreview({ message, onDismiss }: { message: WidgetMessage; onDismiss: () => void }) {
    const isOwnMessage = message.message_type === MESSAGE_TYPE.INCOMING;
    const senderName = isOwnMessage ? t('REPLY.YOU') : message.sender?.name || '';
    const attachmentLabel = message.attachments?.length
        ? t(`ATTACHMENTS.${message.attachments[0].file_type}.CONTENT`)
        : '';

    return (
        <div className="flex items-center gap-2 px-3 pt-2.5 pb-1">
            <span aria-hidden="true" className="self-stretch w-[3px] rounded-full bg-[var(--yona-chat-accent)]" />
            <div className="flex-1 min-w-0 text-xs leading-4">
                <div className="font-medium text-[var(--yona-chat-accent)] truncate">
                    {t('REPLY.REPLYING_TO', { name: senderName })}
                </div>
                <div className="truncate text-[var(--yona-chat-ink-soft)]">{message.content || attachmentLabel}</div>
            </div>
            <button
                type="button"
                aria-label={t('REPLY.CANCEL')}
                title={t('REPLY.CANCEL')}
                className="flex items-center justify-center rounded-full size-11 -me-2 text-[var(--yona-chat-ink-soft)] hover:bg-[var(--yona-chat-field)]"
                onClick={onDismiss}
            >
                <span className="i-lucide-x size-4" />
            </button>
        </div>
    );
}
