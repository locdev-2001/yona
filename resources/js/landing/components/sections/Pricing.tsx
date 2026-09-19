import type { LandingConfig } from '../../config';
import { CtaPair } from '../Button';
import { Section } from '../Section';

/** Dấu cộng ở bốn góc thay cho viền liền — cùng ngôn ngữ với khung lưới của trang. */
function CornerMarks() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0">
            {['-left-1 -top-1', '-right-1 -top-1', '-left-1 -bottom-1', '-right-1 -bottom-1'].map((pos) => (
                <span key={pos} className={`absolute block size-2 ${pos}`}>
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-neutral-400" />
                    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-neutral-400" />
                </span>
            ))}
        </div>
    );
}

// Section duy nhất có nền tràn mép: bảng giá là chỗ người đọc dừng lại, và đổi
// bề mặt toàn chiều rộng là cách rẻ nhất để báo hiệu điều đó.
export function Pricing({ config }: { config: LandingConfig }) {
    const { strings, urls, isAuthenticated } = config;
    const pricing = strings.pricing;

    return (
        <Section id="pricing" surface="panel" rhythm="md" rails={false} backdrop="bg-dotfield bg-dotfield-fade">
            <div className="mx-auto max-w-reading text-center">
                <h2 className="text-balance text-h1">{pricing.title}</h2>
                <p className="mt-5 text-pretty text-base font-light text-neutral-700">{pricing.subtitle}</p>
            </div>

            <div className="relative mx-auto mt-12 max-w-xl bg-neutral-0 p-8 md:mt-16 md:p-10">
                <CornerMarks />

                <h3 className="text-center text-h3">{pricing.plan}</h3>

                {/* Con số là thứ người đọc tới đây để tìm; nó phải to bằng một
                    tiêu đề section, không bằng một dòng chữ thân. */}
                <p className="mt-6 text-center">
                    <span className="block font-num text-display text-neutral-900">{pricing.price}</span>
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

            {/* Chữ nhỏ nằm NGOÀI thẻ: nó nói về chính sách, không phải về gói. */}
            <p className="mx-auto mt-6 max-w-xl text-center text-caption text-neutral-500">{pricing.fine}</p>
        </Section>
    );
}
