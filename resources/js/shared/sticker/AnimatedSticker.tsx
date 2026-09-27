import { lazy, Suspense } from 'react';

import type { StickerPlayerProps } from './StickerPlayer';

function StickerPoster({ posterUrl, alt, className, onPosterError }: StickerPlayerProps) {
    return (
        <img
            src={posterUrl}
            alt={alt}
            loading="lazy"
            draggable={false}
            className={`object-contain ${className ?? ''}`}
            onError={onPosterError}
        />
    );
}

// Cửa vào duy nhất cho bubble: bản thân trình phát cũng nằm ở chunk riêng để JS ban
// đầu của widget/dashboard gần như không đổi. Trong lúc chờ chunk, poster vẫn hiện.
// Chunk tải lỗi (deploy vừa thay hash, mạng rớt) thì ở lại poster: lazy mà ném lỗi
// sẽ gỡ cả cây React của inbox hoặc widget.
const StickerPlayer = lazy(() => import('./StickerPlayer').catch(() => ({ default: StickerPoster })));

export default function AnimatedSticker(props: StickerPlayerProps) {
    return (
        <Suspense fallback={<StickerPoster {...props} />}>
            <StickerPlayer {...props} />
        </Suspense>
    );
}
