import type { LandingConfig } from '../config';
import { ArtMark } from './ArtMark';
import { CtaPair } from './Button';
import { Section } from './Section';

/**
 * Hai cụm tranh chồng lấn, mỗi cụm có một tấm tràn hẳn khỏi mép màn hình.
 *
 * Xếp rời từng tấm cách đều là thứ làm chúng trông như tranh treo tường. Chồng
 * lấn và cắt cụt ở mép mới đọc ra là một mảng thị giác của trang.
 */
const ART = [
    { src: 'hero-1', width: 212, height: 268, className: '-left-28 top-2' },
    { src: 'hero-5', width: 268, height: 104, className: '-left-52 top-60' },
    { src: 'hero-2', width: 236, height: 168, className: '-right-32 top-0' },
    { src: 'hero-3', width: 248, height: 196, className: '-right-44 top-36' },
    { src: 'hero-4', width: 176, height: 176, className: '-right-16 top-72' },
];

export function Hero({ config }: { config: LandingConfig }) {
    const { urls, strings, isAuthenticated } = config;
    const hero = strings.hero;

    return (
        <Section surface="base" rhythm="md">
            {ART.map((art) => (
                <ArtMark key={art.src} {...art} />
            ))}

            {/* Ba dòng: dòng giữa là thông điệp, hai dòng kia lùi lại bằng alpha.
                50% chứ không phải 40%: 40% chỉ đạt 2.61:1, dưới ngưỡng 3:1 của
                chữ lớn. 50% cho 3.54:1 mà mắt gần như không thấy khác. */}
            <h1 className="relative mx-auto max-w-4xl text-balance text-center text-display text-neutral-900/50">
                {hero.title_lead}
                <br />
                <span className="text-neutral-900">{hero.title_focus}</span>
                <br />
                {hero.title_tail}
            </h1>

            <p className="relative mx-auto mt-6 max-w-reading text-pretty text-center text-base font-light text-neutral-700">
                {hero.subtitle}
            </p>

            <div className="relative mt-8">
                {isAuthenticated ? (
                    <CtaPair align="center" primary={{ label: hero.cta_dashboard, href: urls.dashboard }} />
                ) : (
                    <CtaPair
                        align="center"
                        primary={{ label: hero.cta_primary, href: urls.register }}
                        secondary={{ label: hero.cta_secondary, href: urls.login }}
                    />
                )}
            </div>

            {/* Dòng gỡ rào ngay dưới CTA: nó trả lời câu hỏi đầu tiên người đọc
                nghĩ tới khi thấy nút, đúng chỗ họ đang nhìn. */}
            <p className="relative mt-5 flex items-center justify-center gap-2 text-caption text-neutral-500">
                <span aria-hidden className="i-lucide-circle-check size-3.5" />
                {hero.fine}
            </p>
        </Section>
    );
}
