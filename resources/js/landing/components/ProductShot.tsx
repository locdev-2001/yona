import type { ReactNode } from 'react';

// Mỗi khối media có một tông nền riêng. Bề mặt tham chiếu không đặt ảnh chụp
// lên nền trắng bao giờ — luôn có một mảng màu đỡ phía dưới, và chính mảng màu
// đó là thứ cho khối media sức nặng.
const TONE = {
    linen: 'bg-neutral-100',
    sage: 'bg-tone-sage',
    sand: 'bg-tone-sand',
} as const;

export type MediaTone = keyof typeof TONE;

export function MediaWell({
    children,
    tone = 'linen',
    className = '',
}: {
    children: ReactNode;
    tone?: MediaTone;
    className?: string;
}) {
    return <div className={`${TONE[tone]} p-4 md:p-12 ${className}`}>{children}</div>;
}

interface ProductShotProps {
    src: string;
    alt: string;
    /** Kích thước gốc của tệp — trình duyệt dùng nó để giữ chỗ, tránh nhảy bố cục. */
    width: number;
    height: number;
    /** Ảnh trong khung nhìn đầu: nạp ngay, không lazy, để không hỏng LCP. */
    priority?: boolean;
    className?: string;
}

/**
 * Ảnh hiện nguyên khung theo tỉ lệ gốc. KHÔNG object-cover: ảnh chụp màn hình
 * đã cắt sẵn, cover sẽ phóng to rồi cắt tiếp và dễ rơi vào một góc trắng.
 *
 * Bo 8px và bóng mềm là ngoại lệ đã duyệt của §0.1 và §0.3, chỉ cho ảnh sản
 * phẩm ở landing: ảnh cần tách khỏi mảng màu đỡ nó, mà viền 1px thì không đủ.
 */
export function ProductShot({ src, alt, width, height, priority = false, className = '' }: ProductShotProps) {
    return (
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding={priority ? 'sync' : 'async'}
            className={`h-auto w-full rounded-media bg-neutral-0 shadow-media ${className}`}
        />
    );
}
