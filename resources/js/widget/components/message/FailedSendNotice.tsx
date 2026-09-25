import { widgetStore } from '../../store/widgetStore';
import { t } from '../../i18n';
import FailureBlock from './FailureBlock';
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
        <FailureBlock
            title={t(failedTitleKeyOf(message))}
            reason={failure.isNetworkFailure ? t('ATTACHMENT_STATE.UPLOAD_FAILED_NETWORK') : undefined}
            actionLabel={t('ATTACHMENT_STATE.RETRY')}
            onAction={() => void widgetStore.retryMessage(message.id)}
        />
    );
}
