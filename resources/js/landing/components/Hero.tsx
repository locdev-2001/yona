import { useEffect, useState } from 'react';

import type { LandingConfig } from '../config';
import { ButtonLink } from './Button';
import DotField from './DotField';

// Bảng màu chấm theo chủ đề: chàm→tím trên nền thương hiệu, sáng hơn ở chế độ
// tối. Nền sáng cần alpha cao hơn, nếu không chấm bị chìm vào nền xám nhạt.
const DOTS_LIGHT = { gradientFrom: 'rgba(67, 56, 202, 0.60)', gradientTo: 'rgba(147, 51, 234, 0.45)', glowColor: 'rgba(129, 140, 248, 0.55)' };
const DOTS_DARK = { gradientFrom: 'rgba(165, 180, 252, 0.55)', gradientTo: 'rgba(196, 181, 253, 0.32)', glowColor: '#4f46e5' };

// Theo dõi lớp `dark` trên <html> để đổi bảng màu ngay khi khách chuyển giao diện
// (nhánh `main`: hooks/use-is-dark.ts).
function useIsDark(): boolean {
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const observer = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return dark;
}

export function Hero({ config }: { config: LandingConfig }) {
    const { urls, strings, isAuthenticated } = config;
    const dots = useIsDark() ? DOTS_DARK : DOTS_LIGHT;

    return (
        <section className="relative isolate flex min-h-[640px] items-center overflow-hidden lg:min-h-[86vh]">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <DotField dotRadius={4} dotSpacing={18} bulgeStrength={80} glowRadius={200} {...dots} />
            </div>
            <div className="to-canvas pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent" />
            {/* Lớp phủ toả tròn làm dịu các chấm ngay sau phần chữ để phụ đề vẫn đọc được. */}
            <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_55%_45%_at_50%_45%,var(--canvas)_0%,transparent_70%)]" />

            <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
                <span className="border-border/70 bg-card/60 text-muted-foreground inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm">
                    {strings.hero.eyebrow}
                </span>

                <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">{strings.hero.title}</h1>

                <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-pretty">{strings.hero.subtitle}</p>

                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    {isAuthenticated ? (
                        <ButtonLink href={urls.dashboard} size="lg">
                            {strings.hero.cta_dashboard}
                            <span className="i-lucide-arrow-right size-4" aria-hidden="true" />
                        </ButtonLink>
                    ) : (
                        <>
                            <ButtonLink href={urls.register} size="lg">
                                {strings.hero.cta_primary}
                                <span className="i-lucide-arrow-right size-4" aria-hidden="true" />
                            </ButtonLink>
                            <ButtonLink href={urls.login} variant="outline" size="lg">
                                {strings.hero.cta_secondary}
                            </ButtonLink>
                        </>
                    )}
                </div>

                <p className="text-muted-foreground mt-5 text-sm">{strings.hero.hint}</p>
            </div>
        </section>
    );
}
