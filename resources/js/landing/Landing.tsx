import { landingConfig } from './config';
import { Feature } from './components/Feature';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Channels } from './components/sections/Channels';
import { Closing } from './components/sections/Closing';
import { Flow } from './components/sections/Flow';
import { Pricing } from './components/sections/Pricing';
import { ProductTabs } from './components/sections/ProductTabs';
import { Rules } from './components/sections/Rules';

export function Landing() {
    const config = landingConfig();
    const { strings, urls, isAuthenticated } = config;

    const cta = {
        primary: isAuthenticated
            ? { label: strings.hero.cta_dashboard, href: urls.dashboard }
            : { label: strings.cta.primary, href: urls.register },
        secondary: { label: strings.cta.secondary, href: urls.login },
        learn: strings.cta.learn,
    };

    return (
        <div className="flex min-h-screen flex-col pt-16">
            <Header config={config} />

            <main className="flex-1">
                <Hero config={config} />
                <ProductTabs strings={strings.showcase} />
                <Channels strings={strings.channels} />

                <Feature
                    id="features"
                    surface="band"
                    strings={strings.features.inbox}
                    art={{ src: 'feat-ink-1', width: 246, height: 300 }}
                    cta={cta}
                    learnHref={urls.register}
                    media={{
                        kind: 'wide',
                        shot: {
                            src: '/landing/feature-inbox.png',
                            alt: 'Danh sách hội thoại của Yona bên trái, khung chat của một khách từ website bên phải',
                            width: 1600,
                            height: 728,
                        },
                    }}
                />

                {/* Khối thứ hai đổi sang bố cục chia đôi: lặp y hệt dạng của
                    khối thứ nhất thì hai khối đọc thành một. */}
                <Feature
                    strings={strings.features.zalo}
                    art={{ src: 'feat-ink-2', width: 243, height: 300 }}
                    cta={cta}
                    learnHref={urls.register}
                    media={{
                        kind: 'split',
                        shot: {
                            src: '/landing/feature-zalo-tall.png',
                            alt: 'Hội thoại Zalo cá nhân trong hộp thư Yona, kèm danh sách các hội thoại khác',
                            width: 920,
                            height: 900,
                        },
                    }}
                />

                {/* Khối thứ ba đổi sang ba ảnh vuông. Biến thể duy nhất của bộ
                    khung, và nó đến sau hai khối giống hệt nhau nên đọc như cao
                    trào chứ không như lộn xộn. */}
                <Feature
                    surface="band"
                    accent="navy"
                    strings={strings.features.crm}
                    art={{ src: 'feat-ink-3', width: 260, height: 300 }}
                    cta={cta}
                    learnHref={urls.register}
                    media={{
                        kind: 'triptych',
                        shots: [
                            {
                                src: '/landing/square-contacts.png',
                                alt: 'Danh sách liên hệ với tên và số điện thoại khách Việt',
                                width: 1000,
                                height: 1000,
                            },
                            {
                                src: '/landing/square-contact.png',
                                alt: 'Hồ sơ một khách hàng với thuộc tính và lịch sử hội thoại',
                                width: 1000,
                                height: 1000,
                            },
                            {
                                src: '/landing/square-panel.png',
                                alt: 'Bảng hồ sơ khách hiện bên phải hội thoại, có số điện thoại và thuộc tính',
                                width: 1000,
                                height: 1000,
                            },
                        ],
                    }}
                />

                <Flow strings={strings.flow} />
                <Rules strings={strings.rules} />
                <Pricing config={config} />
                <Closing config={config} />
            </main>

            <Footer config={config} />
        </div>
    );
}
