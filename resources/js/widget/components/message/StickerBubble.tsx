import StickerImage from 'shared/sticker/StickerImage';
import { yonaStickerImageUrl, yonaStickerStaticUrl } from 'shared/sticker/stickerPayload';

import { useWidgetState } from '../../store/hooks';
import { t } from '../../i18n';
import type { WidgetMessage } from '../../types';

// Ảnh sticker: máy chủ đã ghi sẵn url khi lưu (sticker kho Yona có `image_url` WebP,
// có thể động); tin tạm phía khách chỉ có mã thì tra danh mục sticker của kênh.
export function stickerImageUrl(
    message: WidgetMessage,
    catalog: { id: string; image_url: string }[],
): string | undefined {
    const sticker = message.content_attributes?.sticker;
    if (sticker && typeof sticker === 'object') return yonaStickerImageUrl(sticker) ?? (sticker.url || sticker.thumbnail);
    if (typeof sticker === 'string') {
        const fromCatalog = catalog.find(item => item.id === sticker)?.image_url;
        if (fromCatalog) return fromCatalog;
    }
    return message.attachments?.[0]?.data_url;
}

// Sticker đứng trần ở cạnh hiển thị đã cấu hình, không bong bóng.
export default function StickerBubble({ message }: { message: WidgetMessage }) {
    const catalog = useWidgetState(state => state.messagingPolicy.stickers);
    const url = stickerImageUrl(message, catalog);

    if (!url) return null;

    return (
        <StickerImage
            src={url}
            staticSrc={yonaStickerStaticUrl(message.content_attributes?.sticker)}
            alt={t('STICKER_PANEL.STICKER_ALT')}
            className={`yona-sticker ${message.status === 'in_progress' ? 'opacity-60' : ''}`}
        />
    );
}
