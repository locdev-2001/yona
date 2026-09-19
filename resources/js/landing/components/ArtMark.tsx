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
    className,
    from = 'xl',
}: {
    src: string;
    width: number;
    height: number;
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
            className={`pointer-events-none absolute select-none ${FROM[from]} ${className}`}
            style={{ width, height }}
        />
    );
}
