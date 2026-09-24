import { useEffect, useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Sticker hiện như sticker, không như ảnh chụp: không khung bong bóng, không mở
// thư viện ảnh, không nút tải về. Vẫn đi qua BaseBubble để giữ biểu cảm, người gửi
// trong nhóm, trích dẫn và giờ gửi.
export default function StickerBubble() {
    const { attachments } = useMessageContext();
    const imageUrl = attachments[0]?.data_url ?? '';
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
                <img
                    className="skip-context-menu size-32 object-contain"
                    src={imageUrl}
                    alt={t('CHAT_LIST.ATTACHMENTS.sticker.CONTENT')}
                    loading="lazy"
                    draggable={false}
                    onError={() => setHasError(true)}
                />
            )}
        </BaseBubble>
    );
}
