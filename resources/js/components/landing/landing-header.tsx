import AppLogoIcon from '@/components/app-logo-icon';
import AppearanceToggleDropdown from '@/components/appearance-dropdown';
import { Button } from '@/components/ui/button';
import { useTranslator } from '@/lib/i18n';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

const BRAND = 'Yona';

export function LandingHeader() {
    const { auth } = usePage<SharedData>().props;
    const t = useTranslator();

    return (
        // Floating "island" header (design-system §5 shell radius): a contained pill that floats over the hero.
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:pt-4">
            <div className="rounded-shell border-border/60 bg-card/70 mx-auto flex h-16 w-full max-w-5xl items-center justify-between border px-4 shadow-lg shadow-black/5 backdrop-blur-md sm:px-6">
                <Link href={route('home')} className="flex items-center gap-2.5">
                    <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
                    </span>
                    <span className="text-base font-semibold tracking-tight">{BRAND}</span>
                </Link>

                <div className="flex items-center gap-2 sm:gap-3">
                    <a
                        href="#features"
                        className="text-muted-foreground hover:text-foreground hidden text-sm font-medium transition-colors sm:inline-block"
                    >
                        {t('platform.landing.nav.features')}
                    </a>
                    <AppearanceToggleDropdown className="hidden sm:inline-flex" />
                    {auth.user ? (
                        <Button asChild size="sm" className="h-11 sm:h-9">
                            <Link href={route('dashboard')}>
                                {t('platform.landing.nav.dashboard')}
                                <ArrowRight />
                            </Link>
                        </Button>
                    ) : (
                        <>
                            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                                <Link href={route('login')}>{t('platform.landing.nav.login')}</Link>
                            </Button>
                            <Button asChild size="sm" className="h-11 sm:h-9">
                                <Link href={route('register')}>{t('platform.landing.nav.register')}</Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
