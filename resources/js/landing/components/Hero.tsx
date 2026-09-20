import type { LandingConfig } from '../config';
import { ArtMark } from './ArtMark';
import { CtaPair } from './Button';
import { Section } from './Section';

/**
 * Bốn tấm, hai mỗi bên: mỗi bên một tấm HIỆN TRỌN trong lề và một tấm tràn nhẹ
 * khỏi mép.
 *
 * Bản trước đẩy cả năm tấm ra ngoài mép nên tấm nào cũng mất một nửa — đọc ra
 * là mảnh vụn dán vào cạnh màn hình. Bề mặt tham chiếu để phần lớn tranh hiện
 * trọn, chỉ một hai tấm bị mép cắt, và cắt cũng chỉ chừng một phần ba.
 *
 * Bề rộng khai bằng class để co theo breakpoint: ở 1280 lề chỉ còn 192px nên
 * tranh phải nhỏ lại mới nằm gọn mà không chạm tiêu đề.
 *
 * Đặt NGANG dải tiêu đề, không đậu ở bốn góc. Đẩy hết ra góc thì giữa trang
 * trống một khoảng lớn và bốn tấm đọc ra là bốn thứ rời rạc ghim vào mép.
 * Chúng phải vây quanh chữ thì mới thành một cụm.
 */
const ART = [
    { src: 'hero-1', width: 212, height: 283, size: 'w-36 2xl:w-48', className: 'left-8 top-1/4' },
    { src: 'hero-3', width: 248, height: 159, size: 'w-40 2xl:w-52', className: '-left-10 bottom-1/4' },
    { src: 'hero-2', width: 236, height: 285, size: 'w-36 2xl:w-48', className: 'right-8 top-1/3' },
    { src: 'hero-4', width: 176, height: 137, size: 'w-36 2xl:w-48', className: '-right-10 bottom-1/4' },
];

export function Hero({ config }: { config: LandingConfig }) {
    const { urls, strings, isAuthenticated } = config;
    const hero = strings.hero;

    return (
        // accent="primary": hero mở đầu mạch hội thoại, dấu góc + eyebrow của
        // section này dùng cùng màu nhấn với mạch đó.
        <Section
            surface="base"
            rhythm="md"
            accent="primary"
            fill
            art={ART.map((art) => (
                <ArtMark key={art.src} {...art} />
            ))}
        >

            {/* Bề mặt tham chiếu có một dòng 14px căn giữa phía trên h1 (bằng
                chứng xã hội của họ). Yona chưa có khách thật để trưng ra nên
                bỏ trống chỗ này — bịa số liệu hay tên khách còn tệ hơn thưa. */}

            {/* Ba dòng: dòng giữa là thông điệp, hai dòng kia lùi lại bằng alpha.
                60% chứ không phải 50%: 50% cho 3.54:1 — qua ngưỡng 3:1 của chữ
                lớn nhưng vẫn đọc ra như chữ placeholder bị vô hiệu, nhất là khi
                hai dòng nhạt kẹp một dòng đậm. 60% cho 4.94:1, vượt cả ngưỡng
                chữ thân, mà vẫn nhạt hơn dòng mực rõ rệt. */}
            <h1 className="relative mx-auto max-w-4xl text-balance text-center text-display text-neutral-900/60">
                {hero.title_lead}
                <br />
                <span className="text-neutral-900">{hero.title_focus}</span>
                <br />
                {hero.title_tail}
            </h1>

            <p className="relative mx-auto mt-6 max-w-reading text-pretty text-center text-base font-light text-neutral-700">
                {hero.subtitle}
            </p>

            {/* Giữ hai nút (không chuyển sang form bắt email như bề mặt tham
                chiếu): Yona chưa có luồng đăng ký chỉ-bằng-email, dựng form mà
                không biết nó dẫn đi đâu là bịa một bước sản phẩm chưa tồn tại. */}
            <div className="relative mt-8">
                {isAuthenticated ? (
                    <CtaPair align="center" primary={{ label: hero.cta_dashboard, href: urls.dashboard }} />
                ) : (
                    <CtaPair
                        align="center"
                        primary={{ label: hero.cta_primary, href: urls.register }}
                        secondary={{ label: strings.nav.demo, href: urls.demo }}
                    />
                )}
            </div>

            {/* Dòng gỡ rào ngay dưới CTA: nó trả lời câu hỏi đầu tiên người đọc
                nghĩ tới khi thấy nút, đúng chỗ họ đang nhìn. 14px căn giữa,
                không icon — số đo thật của bề mặt tham chiếu. */}
            <p className="relative mt-5 text-center text-sm text-neutral-500">{hero.fine}</p>
        </Section>
    );
}
