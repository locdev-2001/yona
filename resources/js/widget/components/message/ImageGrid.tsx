import { useState } from 'react';

import { planImageGrid } from 'shared/helpers/imageGrid';
import type { MessageGroupPosition } from 'shared/helpers/messageGrouping';

import { t } from '../../i18n';
import { bubbleRadius } from './bubbleShape';
import ImageLightbox from './ImageLightbox';
import type { MessageAttachment } from '../../types';

// Tiến trình tải nằm TRONG ô (thanh mảnh dưới đáy), không đẩy layout.
function UploadProgress({ percent }: { percent: number }) {
    return (
        <span
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="absolute inset-x-1.5 bottom-1.5 h-[3px] overflow-hidden rounded-[2px] bg-[var(--yona-chat-progress-track)]"
        >
            <span className="block h-full bg-[var(--yona-chat-accent)]" style={{ width: `${percent}%` }} />
        </span>
    );
}

interface ImageGridProps {
    images: MessageAttachment[];
    isOwn: boolean;
    position: MessageGroupPosition;
    onImageError?: () => void;
}

export default function ImageGrid({ images, isOwn, position, onImageError }: ImageGridProps) {
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const plan = planImageGrid(images);

    return (
        <>
            <div
                className="yona-image-grid grid w-[216px] max-w-full gap-[3px] overflow-hidden"
                data-layout={plan.layout}
                style={{ gridTemplateColumns: plan.columns === 1 ? '1fr' : '1fr 1fr', ...bubbleRadius(isOwn, position) }}
            >
                {plan.tiles.map(tile =>
                    tile.kind === 'overflow' ? (
                        <button
                            key="overflow"
                            type="button"
                            className="flex aspect-square items-center justify-center bg-[var(--yona-chat-solid)] text-[17px] font-semibold text-[var(--yona-chat-on-solid)]"
                            aria-label={t('ATTACHMENT_STATE.VIEW_ALL', { count: images.length })}
                            onClick={() => setLightboxIndex(tile.firstHiddenIndex)}
                        >
                            {`+${tile.hiddenCount}`}
                        </button>
                    ) : (
                        <button
                            key={tile.image.id ?? tile.image.data_url ?? tile.imageIndex}
                            type="button"
                            className={`relative block overflow-hidden bg-[var(--yona-chat-field)] ${
                                tile.spansRow ? 'col-span-2 aspect-[2/1]' : plan.layout === 'single' ? '' : 'aspect-square'
                            }`}
                            aria-label={t('ATTACHMENTS.image.CONTENT')}
                            onClick={() => setLightboxIndex(tile.imageIndex)}
                        >
                            <img
                                src={tile.image.thumb_url || tile.image.data_url}
                                alt=""
                                className={`block w-full object-cover ${plan.layout === 'single' ? 'max-h-[240px]' : 'h-full'}`}
                                onError={onImageError}
                            />
                            {tile.image.status === 'in_progress' ? (
                                <UploadProgress percent={tile.image.progress ?? 0} />
                            ) : null}
                        </button>
                    ),
                )}
            </div>
            {lightboxIndex !== null ? (
                <ImageLightbox images={images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
            ) : null}
        </>
    );
}
