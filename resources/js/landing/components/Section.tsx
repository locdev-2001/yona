import type { ReactNode } from 'react';

/**
 * Khung lưới của trang: hai đường kẻ dọc ở đúng mép container, chạy suốt chiều
 * cao mỗi section, với dấu cộng ở bốn góc.
 *
 * Đây không phải trang trí. Bề mặt công khai có nhiều khoảng trắng; không có
 * khung, mỗi section trôi nổi riêng lẻ và trang mất cấu trúc.
 */
function Rails() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden md:block">
            <span className="absolute inset-y-0 left-0 w-px bg-neutral-300" />
            <span className="absolute inset-y-0 right-0 w-px bg-neutral-300" />
            <PlusMark className="-left-1 -top-1" />
            <PlusMark className="-right-1 -top-1" />
            <PlusMark className="-left-1 -bottom-1" />
            <PlusMark className="-right-1 -bottom-1" />
        </div>
    );
}

function PlusMark({ className }: { className: string }) {
    return (
        <span className={`absolute block size-2 ${className}`}>
            <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-neutral-400" />
            <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-neutral-400" />
        </span>
    );
}

const SURFACE = {
    base: 'bg-neutral-0',
    band: 'bg-neutral-50',
    panel: 'bg-neutral-100',
} as const;

// Nhịp đo từ bề mặt tham chiếu, không chọn bừa.
const RHYTHM = {
    xl: 'py-24 md:py-[13.5rem]', // 216px — riêng section kết
    lg: 'py-16 md:py-28', // 112px — khối tính năng
    md: 'py-12 md:py-20', // 80px — hero, bảng giá
    sm: 'py-10 md:py-16', // 64px — dải kênh
} as const;

interface SectionProps {
    id?: string;
    children: ReactNode;
    surface?: keyof typeof SURFACE;
    rhythm?: keyof typeof RHYTHM;
    rails?: boolean;
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
    rails = true,
    backdrop,
    className = '',
}: SectionProps) {
    // overflow-x-clip: dấu cộng ở góc và ảnh trang trí thò ra ngoài container,
    // khi màn hình hẹp hơn 1170px thì phần thò ra đó đẩy cả trang trượt ngang.
    return (
        <section id={id} className={`relative ${SURFACE[surface]} overflow-x-clip`}>
            {backdrop && <div aria-hidden className={`pointer-events-none absolute inset-0 ${backdrop}`} />}
            <div className={`relative mx-auto max-w-container ${RHYTHM[rhythm]}`}>
                <div className={`relative px-4 md:px-10 ${className}`}>
                    {rails && <Rails />}
                    {children}
                </div>
            </div>
        </section>
    );
}

/**
 * Nhãn nhỏ in hoa, mở đầu bằng một chấm vuông màu thương hiệu.
 *
 * Font mono tách nó khỏi chữ thân; chấm vuông là thứ neo nó vào lề trái và cho
 * mắt một điểm bắt đầu. Icon minh hoạ ở vị trí này lại kể một nội dung thứ hai
 * cạnh nhãn, thừa.
 */
export function Eyebrow({ children }: { children: ReactNode }) {
    return (
        <p className="flex items-center gap-2 font-mono text-eyebrow font-medium uppercase text-neutral-500">
            <span aria-hidden className="size-1.5 shrink-0 bg-primary-600" />
            {children}
        </p>
    );
}
