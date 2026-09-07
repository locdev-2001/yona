import type { LandingStrings } from '../config';

const FEATURES: { key: string; icon: string }[] = [
    { key: 'inbox', icon: 'i-lucide-messages-square' },
    { key: 'crm', icon: 'i-lucide-user-plus' },
    { key: 'automation', icon: 'i-lucide-zap' },
    { key: 'teams', icon: 'i-lucide-shield-check' },
];

export function Features({ strings }: { strings: LandingStrings['features'] }) {
    return (
        <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{strings.title}</h2>
                <p className="text-muted-foreground mt-4 text-lg text-pretty">{strings.subtitle}</p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map(({ key, icon }) => {
                    const feature = strings[key];

                    if (typeof feature === 'string' || !feature) return null;

                    return (
                        <div key={key} className="bg-card rounded-shell border-border/70 border p-6 shadow-sm transition-shadow hover:shadow-md">
                            <span className="bg-accent text-accent-foreground flex size-11 items-center justify-center rounded-xl">
                                <span className={`${icon} size-5`} aria-hidden="true" />
                            </span>
                            <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.description}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
