import type { ImgHTMLAttributes } from 'react';

import { useStickerDisplaySize } from './stickerDisplaySize';

type StickerImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'width' | 'height'> & { src: string };

// Ảnh sticker ở đúng cạnh hiển thị đã cấu hình; WebP động tự chạy. Ô chứa hẹp hơn
// thì ảnh co theo ô chứ không tràn.
export default function StickerImage({ className = '', style, alt = '', ...imageProps }: StickerImageProps) {
    const size = useStickerDisplaySize();

    return (
        <img
            alt={alt}
            loading="lazy"
            draggable={false}
            {...imageProps}
            width={size}
            height={size}
            className={`max-w-full shrink-0 object-contain ${className}`}
            style={{ width: size, height: 'auto', aspectRatio: '1 / 1', ...style }}
        />
    );
}
