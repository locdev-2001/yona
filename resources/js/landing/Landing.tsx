import { landingConfig } from './config';
import { landingCopy } from './copy';
import { Feature } from './components/Feature';
import { Hero } from './components/Hero';
import { Shell } from './components/Shell';
import { Closing } from './components/sections/Closing';
import { Flow } from './components/sections/Flow';
import { Rules } from './components/sections/Rules';

export function Landing() {
    const config = landingConfig();
    const copy = landingCopy(config.locale);

    return (
        <Shell config={config}>
            <Hero config={config} copy={copy} />

            <Feature
                id="features"
                surface="band"
                copy={copy.features.people}
                art={{ src: 'feat-ink-1', width: 246, height: 300 }}
            />

            {/* Khối thứ hai đổi màu nhấn: hai khối cùng màu cạnh nhau đọc thành một. */}
            <Feature copy={copy.features.conversation} accent="navy" art={{ src: 'feat-ink-2', width: 243, height: 300 }} />

            <Flow id="how-it-works" copy={copy.flow} />
            <Rules copy={copy.rules} />
            <Closing config={config} copy={copy} />
        </Shell>
    );
}
