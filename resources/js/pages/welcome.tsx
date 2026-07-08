import { LandingFeatures } from '@/components/landing/landing-features';
import { LandingFooter } from '@/components/landing/landing-footer';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingHero } from '@/components/landing/landing-hero';
import { useTranslator } from '@/lib/i18n';
import { Head } from '@inertiajs/react';

export default function Welcome() {
    const t = useTranslator();

    return (
        <>
            {/* Title template is `${title} - ${appName}`; pass the tagline so the tab isn't the brand name twice. */}
            <Head title={t('platform.landing.hero.eyebrow')}>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700" rel="stylesheet" />
            </Head>
            <div className="bg-canvas text-foreground flex min-h-screen flex-col">
                <LandingHeader />
                <main className="flex-1">
                    <LandingHero />
                    <LandingFeatures />
                </main>
                <LandingFooter />
            </div>
        </>
    );
}
