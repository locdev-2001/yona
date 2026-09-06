import { t } from '../../../../i18n';
import BaseAttachmentBubble from './BaseAttachment';
import { useMessageContext } from '../provider';

// Mở rộng của Yona theo đúng khuôn bubble kênh của bản gốc (Contact.vue,
// InstagramStory.vue): dữ liệu đọc từ content_attributes, khung do
// BaseAttachment dựng. Danh thiếp Zalo = avatar + tên + số + link hồ sơ.

export interface ZaloBusinessCard {
    name?: string | null;
    title?: string | null;
    thumbnail?: string | null;
    url?: string | null;
    phone?: string | null;
    qr_code_url?: string | null;
}

export default function ZaloBusinessCardBubble() {
    const { contentAttributes } = useMessageContext();
    const card = (contentAttributes.business_card ?? {}) as ZaloBusinessCard;

    const name = card.name?.trim() || t('CONVERSATION.ZALO.BUSINESS_CARD.FALLBACK_NAME');
    // `title` của Zalo hay trùng tên — chỉ hiện khi thật sự bổ sung thông tin.
    const subtitle = card.phone?.trim() || (card.title !== card.name ? card.title?.trim() : '') || '';

    return (
        <BaseAttachmentBubble
            icon="i-lucide-contact"
            iconBgColor="bg-[#0068FF]"
            senderTranslationKey="CONVERSATION.SHARED_ATTACHMENT.BUSINESS_CARD"
            title={name}
            content={subtitle}
            action={card.url ? { label: t('CONVERSATION.ZALO.BUSINESS_CARD.VIEW_PROFILE'), href: card.url } : null}
            iconSlot={
                card.thumbnail ? (
                    <img
                        src={card.thumbnail}
                        alt=""
                        loading="lazy"
                        className="size-8 rounded-lg object-cover"
                        data-testid="zalo-business-card-avatar"
                    />
                ) : undefined
            }
        />
    );
}
