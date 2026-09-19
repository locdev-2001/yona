import type { LandingConfig } from '../../config';
import { ArtMark } from '../ArtMark';
import { CtaPair } from '../Button';
import { Section } from '../Section';

// Trang mở bằng tiêu đề 80px giữa những cụm tranh và đóng lại đúng như vậy.
// Nhịp 216px gấp đôi nhịp thường — chỗ này được phép thở rộng nhất.
//
// Khác hero ở chỗ tranh rải KHẮP chiều ngang, cả trên lẫn dưới dòng chữ, không
// dồn về hai mép. Dồn hai mép thì giữa trang trống một khoảng lớn.
const ART = [
    { src: 'end-1', width: 168, height: 168, className: '-left-24 top-8' },
    { src: 'end-ink-1', width: 150, height: 89, className: '-left-4 -top-16' },
    { src: 'end-3', width: 152, height: 112, className: '-left-36 bottom-4' },
    { src: 'end-2', width: 184, height: 124, className: '-right-24 -top-2' },
    { src: 'end-5', width: 164, height: 116, className: 'right-36 bottom-0' },
    { src: 'end-4', width: 140, height: 116, className: '-right-40 top-44' },
];

export function Closing({ config }: { config: LandingConfig }) {
    const { strings, urls, isAuthenticated } = config;
    const closing = strings.closing;

    return (
        <Section surface="base" rhythm="xl">
            {ART.map((art) => (
                <ArtMark key={art.src} {...art} />
            ))}

            <div className="relative mx-auto max-w-3xl text-center">
                <h2 className="text-balance text-display">{closing.title}</h2>
                <p className="mx-auto mt-6 max-w-reading text-pretty text-base font-light text-neutral-700">
                    {closing.subtitle}
                </p>

                <div className="mt-8">
                    {isAuthenticated ? (
                        <CtaPair align="center" primary={{ label: strings.hero.cta_dashboard, href: urls.dashboard }} />
                    ) : (
                        <CtaPair
                            align="center"
                            primary={{ label: closing.cta_primary, href: urls.register }}
                            secondary={{ label: closing.cta_secondary, href: urls.login }}
                        />
                    )}
                </div>
            </div>
        </Section>
    );
}
