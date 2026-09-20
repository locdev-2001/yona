import type { ReactNode } from 'react';

import { ACCENT, type Accent } from './Section';

/**
 * Khung ảnh sản phẩm: một đường viền 1px, VUÔNG GÓC, KHÔNG padding, KHÔNG bóng
 * — ảnh tràn tới sát viền.
 *
 * Bản trước của tệp này đặt ảnh giữa một giếng màu có padding 48px rồi bo góc
 * và đổ bóng. Đo trên bề mặt tham chiếu thì khung media là hộp 1171x530 viền
 * 1px và ảnh chiếm trọn bên trong: không có dải màu quanh ảnh. Dạng "ảnh bồi
 * trong khung" làm khối cao thêm ~130px và đọc ra như ảnh treo tường chứ không
 * phải màn hình sản phẩm.
 *
 * Nền neutral-100 chỉ lộ ra khi ảnh không phủ kín hộp (giếng vuông, panel chia
 * đôi) — đúng như chỗ bề mặt tham chiếu để nền lộ.
 */
export function MediaFrame({
    children,
    framed = true,
    marks,
    className = '',
}: {
    children: ReactNode;
    /** Ảnh tab không có viền; media của khối tính năng thì có. */
    framed?: boolean;
    /** Dấu vuông thụt 16px BÊN TRONG hộp — chỉ dùng cho giếng vuông. */
    marks?: Accent;
    className?: string;
}) {
    return (
        <div
            className={`relative overflow-hidden bg-neutral-100 ${framed ? 'border border-neutral-300' : ''} ${className}`}
        >
            {children}
            {marks && <InnerMarks accent={marks} />}
        </div>
    );
}

/** Bốn dấu vuông 8x8 thụt 16px vào trong một hộp — dùng cho thẻ và giếng ảnh. */
export function InnerMarks({ accent }: { accent: Accent }) {
    const mark = `absolute block size-2 ${ACCENT[accent]}`;

    return (
        <div aria-hidden className="pointer-events-none absolute inset-4">
            <span className={`${mark} left-0 top-0`} />
            <span className={`${mark} right-0 top-0`} />
            <span className={`${mark} bottom-0 left-0`} />
            <span className={`${mark} bottom-0 right-0`} />
        </div>
    );
}

interface ProductShotProps {
    src: string;
    alt: string;
    /** Kích thước gốc của tệp — trình duyệt dùng nó để giữ chỗ, tránh nhảy bố cục. */
    width: number;
    height: number;
    /** Ảnh trong khung nhìn đầu: nạp ngay, không lazy, để không hỏng LCP. */
    priority?: boolean;
    /** Phủ kín hộp thay vì giữ tỉ lệ gốc — chỉ cho giếng vuông với ảnh vuông. */
    cover?: boolean;
    className?: string;
}

/**
 * Ảnh hiện theo tỉ lệ gốc và tràn hết bề rộng khung. KHÔNG bo góc, KHÔNG bóng:
 * khung đã có viền 1px, thêm bo và bóng nữa thì ảnh nổi lên thành một vật thể
 * thứ hai nằm trong hộp.
 */
export function ProductShot({ src, alt, width, height, priority = false, cover = false, className = '' }: ProductShotProps) {
    return (
        <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding={priority ? 'sync' : 'async'}
            className={`block w-full ${cover ? 'size-full object-cover' : 'h-auto'} ${className}`}
        />
    );
}
