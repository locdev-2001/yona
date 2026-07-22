import AppLogoIcon from '@/components/app-logo-icon';
import { useTranslator } from '@/lib/i18n';

const BRAND = 'Yona';

export function LandingFooter() {
    const t = useTranslator();
    const year = new Date().getFullYear();

    return (
        <footer className="border-border/60 border-t">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
                <div className="flex items-center gap-2.5">
                    <span className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                        <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
                    </span>
                    <span className="font-semibold tracking-tight">{BRAND}</span>
                </div>
                <p className="text-muted-foreground text-sm">{t('platform.landing.footer.tagline')}</p>
                <p className="text-muted-foreground/80 text-sm">{t('platform.landing.footer.copyright', { year })}</p>
            </div>
        </footer>
    );
}
