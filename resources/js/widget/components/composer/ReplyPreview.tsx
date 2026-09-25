import { MESSAGE_TYPE } from '../../helpers/constants';
import { t } from '../../i18n';
import { CloseIcon } from '../message/icons';
import type { WidgetMessage } from '../../types';

// Khối "đang trả lời" nằm trên ô nhập theo design: nền ô nhập bo 11, vạch accent,
// "Trả lời <tên>" + một dòng trích, nút X 26px (vùng bấm 44px).
export default function ReplyPreview({ message, onDismiss }: { message: WidgetMessage; onDismiss: () => void }) {
    const isOwnMessage = message.message_type === MESSAGE_TYPE.INCOMING;
    const senderName = isOwnMessage ? t('REPLY.YOU') : message.sender?.name || '';
    const attachmentLabel = message.attachments?.length
        ? t(`ATTACHMENTS.${message.attachments[0].file_type}.CONTENT`)
        : '';

    return (
        <div className="mb-2 flex items-center gap-[9px] rounded-[11px] bg-[var(--yona-chat-field)] py-2 ps-2.5 pe-1">
            <span aria-hidden="true" className="self-stretch w-[3px] flex-none rounded-[2px] bg-[var(--yona-chat-accent)]" />
            <div className="flex-1 min-w-0">
                <div className="truncate text-[11px] font-semibold leading-[1.3] text-[var(--yona-chat-accent)]">
                    {t('REPLY.REPLYING_TO', { name: senderName })}
                </div>
                <div className="truncate text-xs leading-[1.4] text-[var(--yona-chat-ink-soft)]">
                    {message.content || attachmentLabel}
                </div>
            </div>
            <button
                type="button"
                aria-label={t('REPLY.CANCEL')}
                title={t('REPLY.CANCEL')}
                className="relative -my-2 flex size-[26px] flex-none items-center justify-center rounded-full text-[var(--yona-chat-ink-soft)] after:absolute after:-inset-[9px] after:content-[''] hover:bg-[var(--yona-chat-hover)] active:scale-[0.97]"
                onClick={onDismiss}
            >
                <CloseIcon />
            </button>
        </div>
    );
}
