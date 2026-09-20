import type { LandingConfig } from '../config';
import { BrandLogo } from './BrandLogo';
import { ButtonLink } from './Button';

// Nav phẳng: trắng đặc, không viền dưới, không bóng, không blur. Nó tách khỏi
// trang bằng chính độ sáng.
export function Header({ config }: { config: LandingConfig }) {
    const { brand, urls, strings, isAuthenticated } = config;

    return (
        <header className="fixed inset-x-0 top-0 z-50 h-16 bg-neutral-0">
            <div className="mx-auto flex h-full max-w-container items-center justify-between px-4 md:px-10">
                <a
                    href={urls.home}
                    className="flex h-11 items-center rounded md:h-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                >
                    <BrandLogo brand={brand} />
                </a>

                <nav className="flex items-center gap-1 md:gap-2">
                    <a
                        href={`${urls.home}#features`}
                        className="hidden h-11 items-center rounded px-3 text-neutral-700 md:inline-flex md:h-10 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                        {strings.nav.features}
                    </a>
                    <a
                        href={`${urls.home}#pricing`}
                        className="hidden h-11 items-center rounded px-3 text-neutral-700 md:inline-flex md:h-10 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                        {strings.nav.pricing}
                    </a>

                    <a
                        href={urls.demo}
                        className="hidden h-11 items-center rounded px-3 text-neutral-700 md:inline-flex md:h-10 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                        {strings.nav.demo}
                    </a>

                    <LocaleSwitch config={config} />

                    {isAuthenticated ? (
                        <ButtonLink href={urls.dashboard}>{strings.nav.dashboard}</ButtonLink>
                    ) : (
                        <>
                            <ButtonLink href={urls.login} variant="ghost" className="hidden md:inline-flex">
                                {strings.nav.login}
                            </ButtonLink>
                            <ButtonLink href={urls.register}>{strings.nav.register}</ButtonLink>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}

/**
 * Hai ngôn ngữ thì không cần dropdown — bày thẳng cả hai ra, cái đang bật là
 * chữ đen, cái kia là link. Chọn xong middleware nhớ bằng cookie.
 */
function LocaleSwitch({ config }: { config: LandingConfig }) {
    const { locales, locale, strings } = config;

    if (locales.length < 2) {
        return null;
    }

    return (
        <div
            aria-label={strings.nav.language}
            // ml-2/pl-3: gạch dọc phải nằm GIỮA hai cụm. Trước đây chỉ có pl-2 nên nó
            // cách mục nav bên trái 12px mà cách "VI" 16px, dính hẳn về bên trái và
            // đọc ra như dấu phân cách của mục nav chứ không phải của bộ ngôn ngữ.
            className="mr-1 flex items-center gap-0.5 md:ml-3 md:mr-2 md:border-l md:border-neutral-300 md:pl-3"
        >
            {locales.map((option) => {
                const active = option.code === locale;

                return (
                    <a
                        key={option.code}
                        href={option.url}
                        hrefLang={option.code}
                        lang={option.code}
                        aria-current={active ? 'true' : undefined}
                        className={`inline-flex h-11 min-w-11 items-center justify-center rounded px-2 text-sm uppercase md:h-10 md:min-w-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 ${
                            // neutral-700 chứ không phải 500: ở 14px in hoa, 500 đọc ra như
                            // đã bị vô hiệu hoá thay vì một lựa chọn bấm được.
                            active ? 'text-neutral-900' : 'text-neutral-700 hover:text-neutral-900'
                        }`}
                    >
                        {option.code}
                    </a>
                );
            })}
        </div>
    );
}
