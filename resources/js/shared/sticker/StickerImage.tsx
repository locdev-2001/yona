import { useRef } from 'react';
import type { ImgHTMLAttributes } from 'react';

import { useStickerAnimationSlot } from './stickerAnimationBudget';
import { useStickerDisplaySize } from './stickerDisplaySize';

type StickerImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height'> & {
    src: string;
    // Ảnh tĩnh của sticker động: có thì sticker chỉ chạy khi được cấp lượt (stickerAnimationBudget).
    staticSrc?: string | null;
};

// Ảnh sticker ở đúng cạnh hiển thị đã cấu hình. Ô chứa hẹp hơn thì ảnh co theo ô
// chứ không tràn.
export default function StickerImage({ src, staticSrc, className = '', style, alt = '', ...imageProps }: StickerImageProps) {
    const size = useStickerDisplaySize();
    const imageRef = useRef<HTMLImageElement>(null);
    const staticFrame = staticSrc && staticSrc !== src ? staticSrc : null;
    const mayAnimate = useStickerAnimationSlot(imageRef, staticFrame !== null);

    return (
        <img
            alt={alt}
            loading="lazy"
            draggable={false}
            {...imageProps}
            ref={imageRef}
            src={staticFrame && !mayAnimate ? staticFrame : src}
            width={size}
            height={size}
            className={`max-w-full shrink-0 object-contain ${className}`}
            style={{ width: size, height: 'auto', aspectRatio: '1 / 1', ...style }}
        />
    );
}
