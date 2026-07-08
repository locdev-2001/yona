import DotField from '@/components/dot-field';
import { Button } from '@/components/ui/button';
import { useIsDark } from '@/hooks/use-is-dark';
import { useTranslator } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

// Theme-aware dot/glow palette: indigo→violet on the brand canvas, brighter on dark.
// Light mode needs higher alpha + a saturated glow or the dots wash out on the light-gray canvas.
const DOTS_LIGHT = { gradientFrom: 'rgba(67, 56, 202, 0.60)', gradientTo: 'rgba(147, 51, 234, 0.45)', glowColor: 'rgba(129, 140, 248, 0.55)' };
const DOTS_DARK = { gradientFrom: 'rgba(165, 180, 252, 0.55)', gradientTo: 'rgba(196, 181, 253, 0.32)', glowColor: '#4f46e5' };

export function LandingHero() {
    const { auth } = usePage<SharedData>().props;
    const t = useTranslator();
    const dots = useIsDark() ? DOTS_DARK : DOTS_LIGHT;

    return (
        <section className="relative isolate flex min-h-[640px] items-center overflow-hidden lg:min-h-[86vh]">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <DotField dotRadius={4} dotSpacing={18} bulgeStrength={80} glowRadius={200} {...dots} />
            </div>
            <div className="to-canvas pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent" />
            {/* Soft radial scrim calms the dots directly behind the copy so the subtitle stays legible. */}
            <div className="pointer-events-none absolute inset-0 -z-10 [background:radial-gradient(ellipse_55%_45%_at_50%_45%,var(--canvas)_0%,transparent_70%)]" />

            <div className="mx-auto w-full max-w-3xl px-4 py-24 text-center sm:px-6">
                <span className="border-border/70 bg-card/60 text-muted-foreground inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm">
                    {t('platform.landing.hero.eyebrow')}
                </span>

                <h1 className="mt-6 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">{t('platform.landing.hero.title')}</h1>

                <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg text-pretty">{t('platform.landing.hero.subtitle')}</p>

                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    {auth.user ? (
                        <Button asChild size="lg">
                            <Link href={route('dashboard')}>
                                {t('platform.landing.hero.cta_dashboard')}
                                <ArrowRight />
                            </Link>
                        </Button>
                    ) : (
                        <>
                            <Button asChild size="lg">
                                <Link href={route('register')}>
                                    {t('platform.landing.hero.cta_primary')}
                                    <ArrowRight />
                                </Link>
                            </Button>
                            <Button asChild variant="outline" size="lg">
                                <Link href={route('login')}>{t('platform.landing.hero.cta_secondary')}</Link>
                            </Button>
                        </>
                    )}
                </div>

                <p className="text-muted-foreground mt-5 text-sm">{t('platform.landing.hero.hint')}</p>
            </div>
        </section>
    );
}
