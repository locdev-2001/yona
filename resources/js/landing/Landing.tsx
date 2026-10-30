import { landingConfig, type LandingConfig } from './config';
import { landingCopy } from './copy';
import { Feature } from './components/Feature';
import { Hero } from './components/Hero';
import { Shell } from './components/Shell';
import { Closing } from './components/sections/Closing';
import { Flow } from './components/sections/Flow';
import { Rules } from './components/sections/Rules';
import { BrandStory } from './components/sections/BrandStory';
import { Questions } from './components/sections/Questions';

export function Landing({ config = landingConfig() }: { config?: LandingConfig }) {
    const copy = landingCopy(config.locale);

    return (
        <Shell config={config}>
            <Hero config={config} copy={copy} />

            <Feature
                id="features"
                surface="band"
                copy={copy.features.platform}
                art={{ src: 'feat-ink-1', width: 246, height: 300 }}
            />

            <Feature copy={copy.features.conversation} accent="navy" art={{ src: 'feat-ink-2', width: 243, height: 300 }} />

            <Feature id="connections" surface="band" copy={copy.features.inbox} />
            <BrandStory copy={copy.story} />
            <Flow id="how-it-works" copy={copy.flow} />
            <Rules copy={copy.rules} />
            <Questions copy={copy.questions} />
            <Closing config={config} copy={copy} />
        </Shell>
    );
}
