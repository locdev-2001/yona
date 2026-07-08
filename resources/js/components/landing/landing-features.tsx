import { useTranslator } from '@/lib/i18n';
import { Building2, Network, ShieldCheck, Zap, type LucideIcon } from 'lucide-react';

const FEATURES: { key: string; icon: LucideIcon }[] = [
    { key: 'workspaces', icon: Building2 },
    { key: 'roles', icon: ShieldCheck },
    { key: 'teams', icon: Network },
    { key: 'realtime', icon: Zap },
];

export function LandingFeatures() {
    const t = useTranslator();

    return (
        <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{t('platform.landing.features.title')}</h2>
                <p className="text-muted-foreground mt-4 text-lg text-pretty">{t('platform.landing.features.subtitle')}</p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map(({ key, icon: Icon }) => (
                    <div key={key} className="bg-card rounded-shell border-border/70 border p-6 shadow-sm transition-shadow hover:shadow-md">
                        <span className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl">
                            <Icon className="size-5" />
                        </span>
                        <h3 className="mt-5 text-lg font-semibold">{t(`platform.landing.features.${key}.title`)}</h3>
                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{t(`platform.landing.features.${key}.description`)}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
