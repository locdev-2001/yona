import type { LandingConfig } from '../config';
import { AppearanceToggle } from './AppearanceToggle';
import { BrandLogo } from './BrandLogo';
import { ButtonLink } from './Button';

// Thanh đầu trang dạng "đảo nổi" — chuyển nguyên bố cục từ nhánh `main`
// (components/landing/landing-header.tsx).
export function Header({ config }: { config: LandingConfig }) {
    const { brand, urls, strings, isAuthenticated } = config;

    return (
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:pt-4">
            <div className="rounded-shell border-border/60 bg-card/70 mx-auto flex h-16 w-full max-w-5xl items-center justify-between border px-4 shadow-lg shadow-black/5 backdrop-blur-md sm:px-6">
                <a href={urls.home} className="flex items-center gap-2.5">
                    <BrandLogo brand={brand} />
                </a>

                <div className="flex items-center gap-2 sm:gap-3">
                    <a
                        href="#features"
                        className="text-muted-foreground hover:text-foreground hidden text-sm font-medium transition-colors sm:inline-block"
                    >
                        {strings.nav.features}
                    </a>
                    <AppearanceToggle strings={strings.appearance} className="hidden sm:inline-flex" />
                    {isAuthenticated ? (
                        <ButtonLink href={urls.dashboard} className="h-11 sm:h-9">
                            {strings.nav.dashboard}
                            <span className="i-lucide-arrow-right size-4" aria-hidden="true" />
                        </ButtonLink>
                    ) : (
                        <>
                            <ButtonLink href={urls.login} variant="ghost" className="hidden sm:inline-flex">
                                {strings.nav.login}
                            </ButtonLink>
                            <ButtonLink href={urls.register} className="h-11 sm:h-9">
                                {strings.nav.register}
                            </ButtonLink>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
