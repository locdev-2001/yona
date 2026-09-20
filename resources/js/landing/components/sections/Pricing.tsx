import type { LandingConfig } from '../../config';
import { CtaPair } from '../Button';
import { Section } from '../Section';

/**
 * Dấu góc 4x4 đặc màu mực — bề mặt tham chiếu đánh dấu bốn góc thẻ giá bằng
 * hình vuông nhỏ, KHÔNG phải dấu cộng. Cỡ 4x4 (không phải 8x8 của InnerMarks
 * dùng cho khối ảnh) vì thẻ giá là bề mặt phụ trong section, nhỏ hơn khối ảnh
 * sản phẩm một bậc.
 */
function InkCorners() {
    const mark = 'absolute block size-1 bg-neutral-900';
    return (
        <div aria-hidden className="pointer-events-none absolute inset-4">
            <span className={`${mark} left-0 top-0`} />
            <span className={`${mark} right-0 top-0`} />
            <span className={`${mark} bottom-0 left-0`} />
            <span className={`${mark} bottom-0 right-0`} />
        </div>
    );
}

// Section duy nhất có nền tràn mép: bảng giá là chỗ người đọc dừng lại, và đổi
// bề mặt toàn chiều rộng là cách rẻ nhất để báo hiệu điều đó.
//
// Nền hoa văn: bề mặt tham chiếu dùng một ẢNH trang trí phủ kín section; ta
// không có asset đó nên GIỮ hoa văn chấm bi hiện có — lệch có chủ đích, không
// phải thiếu sót.
export function Pricing({ config }: { config: LandingConfig }) {
    const { strings, urls, isAuthenticated } = config;
    const pricing = strings.pricing;

    return (
        <Section id="pricing" surface="band" rhythm="md" marks={false} backdrop="bg-dotfield bg-dotfield-fade">
            <div className="mx-auto max-w-reading text-center">
                <h2 className="text-balance text-h1">{pricing.title}</h2>
                <p className="mt-5 text-pretty text-base font-light text-neutral-700">{pricing.subtitle}</p>
            </div>

            {/* Thẻ giá và chú thích xếp liền nhau, không khoảng hở: cùng nền
                neutral-100 nổi trên nền band (neutral-50) của section, và cùng
                bề rộng ~60% container — hai khối đọc như một bề mặt bị một
                đường biên chia đôi, không phải hai khối tách rời. */}
            <div className="mx-auto mt-12 w-full md:mt-16 md:max-w-price">
                <div className="relative bg-neutral-100 p-8 md:p-16">
                    <InkCorners />

                    <h3 className="text-center text-h2">{pricing.plan}</h3>

                    {/* Con số là thứ người đọc tới đây để tìm; nó phải to bằng
                        tiêu đề section (h1), không to bằng khối mở trang (display). */}
                    <p className="mt-6 text-center">
                        <span className="block font-num text-h1 text-neutral-900">{pricing.price}</span>
                        <span className="mt-2 block font-mono text-eyebrow uppercase text-neutral-500">{pricing.unit}</span>
                    </p>

                    <ul className="mt-8 space-y-3 border-t border-neutral-300 pt-8">
                        {Object.entries(pricing.points).map(([key, point]) => (
                            <li key={key} className="flex gap-2.5 text-sm font-light text-neutral-700">
                                <span aria-hidden className="i-lucide-check mt-0.5 size-4 shrink-0 text-primary-700" />
                                {point}
                            </li>
                        ))}
                    </ul>

                    <div className="mt-8 flex justify-center">
                        <CtaPair
                            align="center"
                            primary={{
                                label: isAuthenticated ? strings.hero.cta_dashboard : pricing.cta,
                                href: isAuthenticated ? urls.dashboard : urls.register,
                            }}
                            secondary={{ label: strings.cta.secondary, href: urls.login }}
                        />
                    </div>
                </div>

                {/* Chú thích là một khối riêng, không phải một dòng chữ trơ
                    dưới thẻ: cùng bề rộng, cùng nền, và chia đường biên với
                    thẻ ở trên thay vì cách một khoảng trắng. */}
                <div className="relative border-t border-neutral-300 bg-neutral-100 px-8 py-6">
                    <InkCorners />
                    <p className="text-center text-base text-neutral-700">{pricing.fine}</p>
                </div>
            </div>
        </Section>
    );
}
