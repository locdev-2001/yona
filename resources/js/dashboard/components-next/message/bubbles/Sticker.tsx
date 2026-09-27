import { useEffect, useState } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import AnimatedSticker from 'shared/sticker/AnimatedSticker';
import { animatedStickerSource } from 'shared/sticker/stickerPayload';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';

// Sticker hiện như sticker, không như ảnh chụp: không khung bong bóng, không mở
// thư viện ảnh, không nút tải về. Vẫn đi qua BaseBubble để giữ biểu cảm, người gửi
// trong nhóm, trích dẫn và giờ gửi. Sticker kho Yona thì phát bản động.
const STICKER_CLASS = 'skip-context-menu size-32';

export default function StickerBubble() {
    const { attachments, contentAttributes } = useMessageContext();
    const imageUrl = attachments[0]?.data_url ?? '';
    const animated = animatedStickerSource(contentAttributes.sticker);
    const [hasError, setHasError] = useState(false);

    useEffect(() => setHasError(false), [imageUrl]);

    const alt = t('CHAT_LIST.ATTACHMENTS.sticker.CONTENT');

    return (
        <BaseBubble className="!bg-transparent !p-0" dataBubbleName="sticker">
            {animated && !hasError ? (
                <AnimatedSticker
                    className={STICKER_CLASS}
                    posterUrl={animated.posterUrl}
                    animationUrl={animated.animationUrl}
                    alt={alt}
                    onPosterError={() => setHasError(true)}
                />
            ) : hasError || imageUrl === '' ? (
                <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-n-alpha-2 text-n-slate-11">
                    <Icon icon="i-lucide-circle-off" />
                    <p className="mb-0">{t('COMPONENTS.MEDIA.IMAGE_UNAVAILABLE')}</p>
                </div>
            ) : (
                <img
                    className={`${STICKER_CLASS} object-contain`}
                    src={imageUrl}
                    alt={alt}
                    loading="lazy"
                    draggable={false}
                    onError={() => setHasError(true)}
                />
            )}
        </BaseBubble>
    );
}
