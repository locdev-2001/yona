import { fillPlaceholders, type LandingConfig } from '../config';
import { BrandLogo } from './BrandLogo';

export function Footer({ config }: { config: LandingConfig }) {
    const { brand, strings, year } = config;

    return (
        <footer className="border-border/60 border-t">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
                <BrandLogo brand={brand} />
                <p className="text-muted-foreground text-sm">{strings.footer.tagline}</p>
                <p className="text-muted-foreground/80 text-sm">{fillPlaceholders(strings.footer.copyright, { year })}</p>
            </div>
        </footer>
    );
}
