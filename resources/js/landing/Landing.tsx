import { landingConfig } from './config';
import { Features } from './components/Features';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';

// Trang chủ công khai — chuyển từ `resources/js/pages/welcome.tsx` của nhánh `main`.
export function Landing() {
    const config = landingConfig();

    return (
        <div className="bg-canvas text-foreground flex min-h-screen flex-col">
            <Header config={config} />
            <main className="flex-1">
                <Hero config={config} />
                <Features strings={config.strings.features} />
            </main>
            <Footer config={config} />
        </div>
    );
}
