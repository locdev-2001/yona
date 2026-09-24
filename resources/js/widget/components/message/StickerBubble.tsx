import { useWidgetState } from '../../store/hooks';
import { t } from '../../i18n';
import type { WidgetMessage } from '../../types';

// Ảnh sticker: máy chủ đã ghi sẵn url khi lưu; tin tạm phía khách chỉ có mã thì
// tra danh mục sticker của kênh.
export function stickerImageUrl(
    message: WidgetMessage,
    catalog: { id: string; image_url: string }[],
): string | undefined {
    const sticker = message.content_attributes?.sticker;
    if (sticker && typeof sticker === 'object') return sticker.url || sticker.thumbnail;
    if (typeof sticker === 'string') {
        const fromCatalog = catalog.find(item => item.id === sticker)?.image_url;
        if (fromCatalog) return fromCatalog;
    }
    return message.attachments?.[0]?.data_url;
}

// Sticker đứng trần 100×100, không bong bóng.
export default function StickerBubble({ message }: { message: WidgetMessage }) {
    const catalog = useWidgetState(state => state.messagingPolicy.stickers);
    const url = stickerImageUrl(message, catalog);

    if (!url) return null;

    return (
        <img
            src={url}
            alt={t('STICKER_PANEL.STICKER_ALT')}
            className={`yona-sticker h-[100px] w-[100px] object-contain ${message.status === 'in_progress' ? 'opacity-60' : ''}`}
        />
    );
}
