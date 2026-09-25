import { uploadCancelPlacement } from '../../helpers/messageHelpers';
import { widgetStore } from '../../store/widgetStore';
import { t } from '../../i18n';
import type { WidgetMessage } from '../../types';

// Nút "Huỷ gửi" duy nhất dưới tin nhiều tệp (hoặc có ảnh) đang tải lên: huỷ cả tin.
export default function CancelSendButton({ message }: { message: WidgetMessage }) {
    if (uploadCancelPlacement(message) !== 'message') return null;

    return (
        <button
            type="button"
            className="flex min-h-11 items-center px-2 text-[11.5px] font-medium leading-[1.3] text-[var(--yona-chat-ink-soft)] hover:text-[var(--yona-chat-ink)] active:scale-[0.97]"
            onClick={() => widgetStore.cancelSend(message.id)}
        >
            {t('COMPOSER.CANCEL_SEND')}
        </button>
    );
}
