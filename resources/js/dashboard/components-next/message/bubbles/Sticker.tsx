import { useEffect, useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import StickerImage from 'shared/sticker/StickerImage';
import { yonaStickerImageUrl } from 'shared/sticker/stickerPayload';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Sticker hiện như sticker, không như ảnh chụp: không khung bong bóng, không mở
// thư viện ảnh, không nút tải về. Vẫn đi qua BaseBubble để giữ biểu cảm, người gửi
// trong nhóm, trích dẫn và giờ gửi. Sticker kho Yona hiện ảnh WebP (động nếu có),
// sticker kênh ngoài hiện ảnh đính kèm.
export default function StickerBubble() {
    const { attachments, contentAttributes } = useMessageContext();
    const imageUrl = yonaStickerImageUrl(contentAttributes.sticker) ?? attachments[0]?.data_url ?? '';
    const [hasError, setHasError] = useState(false);

    useEffect(() => setHasError(false), [imageUrl]);

    return (
        <BaseBubble className="!bg-transparent !p-0" dataBubbleName="sticker">
            {hasError || imageUrl === '' ? (
                <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-n-alpha-2 text-n-slate-11">
                    <Icon icon="i-lucide-circle-off" />
                    <p className="mb-0">{t('COMPONENTS.MEDIA.IMAGE_UNAVAILABLE')}</p>
                </div>
            ) : (
                <StickerImage
                    className="skip-context-menu"
                    src={imageUrl}
                    alt={t('CHAT_LIST.ATTACHMENTS.sticker.CONTENT')}
                    onError={() => setHasError(true)}
                />
            )}
        </BaseBubble>
    );
}
