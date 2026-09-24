import { widgetStore } from '../../store/widgetStore';
import { t } from '../../i18n';
import { AlertCircleIcon } from './icons';
import type { WidgetMessage } from '../../types';

const failedTitleKeyOf = (message: WidgetMessage): string => {
    const attachments = message.attachments ?? [];
    if (!attachments.length) return 'DELIVERY.FAILED_TITLE';
    return attachments.every(attachment => attachment.file_type === 'image')
        ? 'ATTACHMENT_STATE.UPLOAD_FAILED_TITLE'
        : 'ATTACHMENT_STATE.UPLOAD_FAILED_FILE_TITLE';
};

// Khối lỗi dưới tin gửi hỏng. Chỉ hiện khi payload gốc còn trong bộ nhớ (chưa tải lại
// trang), vì "Thử lại" phải gửi đúng chữ, tệp và tin được trả lời như lần đầu.
export default function FailedSendNotice({ message }: { message: WidgetMessage }) {
    if (message.status !== 'failed') return null;
    const failure = widgetStore.retryableFailureOf(message.id);
    if (!failure) return null;

    return (
        <div
            role="alert"
            className="yona-failed-send flex max-w-full items-center gap-[9px] rounded-[14px] border border-[var(--yona-chat-danger-line)] bg-[var(--yona-chat-danger-bg)] px-3 py-[9px] text-[var(--yona-chat-danger)]"
        >
            <span className="flex-none">
                <AlertCircleIcon />
            </span>
            <div className="min-w-0 flex-1 leading-[1.35]">
                <div className="text-[12.5px] font-medium">{t(failedTitleKeyOf(message))}</div>
                {failure.isNetworkFailure ? (
                    <div className="text-[11px] opacity-80">{t('ATTACHMENT_STATE.UPLOAD_FAILED_NETWORK')}</div>
                ) : null}
            </div>
            <button
                type="button"
                className="-my-2 inline-flex min-h-11 min-w-11 flex-none items-center justify-center whitespace-nowrap rounded-[10px] px-2 text-[11.5px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--yona-chat-danger)]"
                onClick={() => widgetStore.retryMessage(message.id)}
            >
                {t('ATTACHMENT_STATE.RETRY')}
            </button>
        </div>
    );
}
