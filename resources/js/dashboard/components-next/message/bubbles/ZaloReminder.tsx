import { t } from '../../../../i18n';
import BaseAttachmentBubble from './BaseAttachment';
import { useMessageContext } from '../provider';

// Mở rộng của Yona (xem ZaloBusinessCard). Thẻ nhắc hẹn: tiêu đề + thời điểm,
// đúng thứ Zalo hiện; chuỗi ngày giờ do Zalo dựng sẵn nên dùng lại nguyên văn.

export interface ZaloReminder {
    title?: string | null;
    description?: string | null;
    emoji?: string | null;
    start_time?: number | null;
}

export default function ZaloReminderBubble() {
    const { contentAttributes } = useMessageContext();
    const reminder = (contentAttributes.reminder ?? {}) as ZaloReminder;

    const title = reminder.title?.trim() || t('CONVERSATION.ZALO.REMINDER.FALLBACK_TITLE');

    return (
        <BaseAttachmentBubble
            icon="i-lucide-alarm-clock"
            iconBgColor="bg-[#0068FF]"
            senderTranslationKey="CONVERSATION.SHARED_ATTACHMENT.REMINDER"
            title={reminder.emoji ? `${reminder.emoji} ${title}` : title}
            content={reminder.description?.trim() ?? ''}
            action={null}
        />
    );
}
