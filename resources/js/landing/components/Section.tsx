import type { ReactNode } from 'react';

/**
 * Màu của dấu cấu trúc. Bề mặt tham chiếu luân phiên hai màu nhận diện theo
 * dòng sản phẩm mà section đang nói tới, và một màu xám cho section trung tính
 * — nhờ vậy mắt nhận ra "khối này vẫn thuộc mạch hội thoại" mà không cần chữ.
 *
 * Trang chủ luân phiên primary và navy giữa các khối liền nhau. KHÔNG dùng
 * cyan ở đây: §1 chốt cyan chỉ được đặt trên nền navy.
 */
export const ACCENT = {
    primary: 'bg-primary-600',
    navy: 'bg-navy',
    neutral: 'bg-neutral-300',
} as const;

export type Accent = keyof typeof ACCENT;

/**
 * Bốn hình vuông đặc 8x8 ở bốn góc section, thụt 16px khỏi mép MÀN HÌNH (không
 * phải mép container).
 *
 * Đo trên bề mặt tham chiếu: toàn trang không có một đường kẻ dọc 1px nào và
 * không có hairline ngang nào — cấu trúc chỉ được đánh bằng những dấu vuông
 * này. Hai đường kẻ dọc chạy suốt mỗi section (bản trước của tệp này) là một hệ
 * khác và rậm hơn: nó vẽ ra cái khung, thay vì chỉ đánh dấu bốn góc.
 */
function CornerMarks({ accent }: { accent: Accent }) {
    const mark = `absolute block size-2 ${ACCENT[accent]}`;

    return (
        <div aria-hidden className="pointer-events-none absolute inset-4 hidden md:block">
            <span className={`${mark} left-0 top-0`} />
            <span className={`${mark} right-0 top-0`} />
            <span className={`${mark} bottom-0 left-0`} />
            <span className={`${mark} bottom-0 right-0`} />
        </div>
    );
}

const SURFACE = {
    base: 'bg-neutral-0',
    band: 'bg-neutral-50',
    panel: 'bg-neutral-100',
} as const;

const RHYTHM = {
    xl: 'py-24 md:py-[13.5rem]', // 216px — riêng section kết
    lg: 'py-16 md:py-28', // 112px — khối tính năng
    md: 'py-12 md:py-20', // 80px — hero, các bước
    sm: 'py-10 md:py-16', // 64px — dải kênh
} as const;

interface SectionProps {
    id?: string;
    children: ReactNode;
    surface?: keyof typeof SURFACE;
    rhythm?: keyof typeof RHYTHM;
    accent?: Accent;
    marks?: boolean;
    /**
     * Section chiếm đúng một màn hình: cao tối thiểu bằng viewport trừ 64px
     * thanh nav cố định, nội dung căn giữa theo chiều dọc.
     *
     * `min-h` chứ không phải `h`: chữ dài hơn dự kiến thì section cao thêm,
     * còn hơn là chữ bị cắt. `dvh` chứ không phải `vh`: trên iOS `vh` tính cả
     * dải địa chỉ đang ẩn, nên hero bị đẩy quá một màn hình.
     */
    fill?: boolean;
    /**
     * Tranh trang trí, đặt trong một lớp phủ TOÀN BỘ chiều cao section.
     *
     * Phải là lớp riêng chứ không phải con của div nội dung: div nội dung chỉ
     * cao bằng dòng chữ, nên `top`/`bottom` của tranh luôn rơi sát chữ và
     * không có cách nào đặt tranh ra phía trên hay phía dưới khối chữ. Nhịp
     * 216px của section kết nằm NGOÀI div đó.
     */
    art?: ReactNode;
    /**
     * Lớp hoa văn trang trí phủ toàn bộ section, nằm SAU nội dung.
     *
     * Phải là một lớp riêng chứ không phải class trên div nội dung: hoa văn
     * thường đi kèm `mask-image`, mà mask áp lên phần tử thì áp luôn lên mọi
     * phần tử con — chữ và thẻ bị làm mờ theo.
     */
    backdrop?: string;
    className?: string;
}

export function Section({
    id,
    children,
    surface = 'base',
    rhythm = 'lg',
    accent = 'neutral',
    marks = true,
    fill = false,
    art,
    backdrop,
    className = '',
}: SectionProps) {
    return (
        <section id={id} className={`relative ${SURFACE[surface]} overflow-x-clip`}>
            {backdrop && <div aria-hidden className={`pointer-events-none absolute inset-0 ${backdrop}`} />}
            {marks && <CornerMarks accent={accent} />}
            {art && (
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    {art}
                </div>
            )}
            <div
                className={`relative mx-auto max-w-container ${RHYTHM[rhythm]} ${
                    fill ? 'flex min-h-[calc(100dvh-4rem)] flex-col justify-center' : ''
                }`}
            >
                <div className={`relative px-4 md:px-10 ${className}`}>{children}</div>
            </div>
        </section>
    );
}

/**
 * Nhãn nhỏ in hoa, mở đầu bằng một vuông đặc 8x8 cùng màu với dấu góc section.
 *
 * Đo được: 12px, lh 1.0, ls +0.05em, weight thường, màu MỰC — không phải xám.
 * Nhãn xám nhạt tụt xuống hàng chú thích; ở bề mặt tham chiếu nó là dòng đầu
 * của khối và đọc ngang hàng tiêu đề.
 */
export function Eyebrow({ children, accent = 'primary' }: { children: ReactNode; accent?: Accent }) {
    return (
        <span className="inline-flex items-center gap-2 font-mono text-eyebrow uppercase text-neutral-900">
            <span aria-hidden className={`size-2 shrink-0 ${ACCENT[accent]}`} />
            {children}
        </span>
    );
}

/** Hai nhãn cạnh nhau: section nói về cả hai mạch sản phẩm cùng lúc. */
export function EyebrowPair({ children }: { children: ReactNode }) {
    return <p className="flex flex-wrap items-center gap-x-6 gap-y-2">{children}</p>;
}
