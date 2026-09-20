/**
 * Ảnh trang trí: tranh khắc gỗ thuộc phạm vi công cộng, đặt tự do quanh các
 * khối chữ.
 *
 * Vai trò của nó là lấp hai bên khoảng trắng mà tiêu đề để lại. Không có nó,
 * hero và section kết chỉ là chữ trôi trên nền trắng.
 *
 * `aria-hidden` vì đây thuần trang trí; xuất xứ và giấy phép nằm ở
 * public/landing/art/CREDITS.json.
 */

// Chỉ hiện khi hai bên tiêu đề còn chỗ thật. Dưới ngưỡng này ảnh đè lên chữ —
// tranh trang trí đè tiêu đề thì tệ hơn hẳn so với không có tranh.
// Dưới 1280px container co lại nhưng tranh thì không, nên khoảng lệch âm kéo
// tranh vào đè lên chữ. Đo ở 1024 thấy cả cụm hero đè lên h1 — nên ngưỡng là xl
// cho mọi vị trí, không có ngoại lệ.
const FROM = {
    xl: 'hidden xl:block',
} as const;

export function ArtMark({
    src,
    width,
    height,
    size,
    className,
    from = 'xl',
}: {
    src: string;
    /** Kích thước gốc của tệp — chỉ để trình duyệt giữ chỗ, tránh nhảy bố cục. */
    width: number;
    height: number;
    /**
     * Bề rộng hiển thị, khai bằng class Tailwind để co theo breakpoint.
     *
     * Bản trước ép `style={{width, height}}` cứng: một cỡ cho mọi màn hình. Ở
     * 1280 lề hai bên tiêu đề chỉ còn 192px, mà tranh thì vẫn 212-268px, nên
     * cách duy nhất để tranh không đè chữ là đẩy nó ra ngoài mép — và thế là
     * tấm nào cũng bị cắt mất một nửa. Cho bề rộng co lại theo breakpoint thì
     * tranh nằm GỌN trong lề, hiện trọn vẹn.
     *
     * Chiều cao luôn `h-auto`: ép cả hai chiều là nét bị kéo méo.
     */
    size: string;
    className: string;
    from?: keyof typeof FROM;
}) {
    return (
        <img
            aria-hidden
            alt=""
            src={`/landing/art/${src}.webp`}
            width={width}
            height={height}
            loading="lazy"
            decoding="async"
            // select-none: ảnh trang trí không nên bị tóm vào vùng bôi đen khi
            // người đọc quét chọn tiêu đề.
            className={`pointer-events-none absolute h-auto select-none ${FROM[from]} ${size} ${className}`}
        />
    );
}
