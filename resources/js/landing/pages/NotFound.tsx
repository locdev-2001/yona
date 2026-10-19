import type { LandingConfig } from '../config';
import { landingCopy } from '../copy';
import { CtaPair } from '../components/Button';
import { Eyebrow, Section } from '../components/Section';

/**
 * Trang 404 có thương hiệu (resources/views/errors/404.blade.php).
 *
 * Đi đúng hai lối người lạc đường thật sự cần: trang chủ, và chỗ làm việc của
 * họ. Người đã đăng nhập thì lối thứ hai là app, không phải màn đăng nhập.
 */
export function NotFound({ config }: { config: LandingConfig }) {
    const { notFound, urls, isAuthenticated } = config;
    const strings = landingCopy(config.locale);

    if (!notFound) {
        return null;
    }

    const workspace = isAuthenticated
        ? { label: strings.nav.open_app, href: urls.dashboard }
        : { label: strings.nav.login, href: urls.login };

    return (
        <Section surface="base" rhythm="md" accent="neutral" fill>
            <div className="max-w-reading">
                <Eyebrow accent="neutral">{notFound.eyebrow}</Eyebrow>
                <h1 className="mt-5 text-balance text-h1">{notFound.title}</h1>
                <p className="mt-5 text-lead font-light text-neutral-700">{notFound.lead}</p>
                <div className="mt-10">
                    <CtaPair primary={{ label: notFound.home, href: urls.home }} secondary={workspace} />
                </div>
            </div>
        </Section>
    );
}
