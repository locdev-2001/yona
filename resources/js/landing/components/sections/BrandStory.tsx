import type { LandingCopy } from '../../copy';
import { Eyebrow, Section } from '../Section';

export function BrandStory({ copy }: { copy: LandingCopy['story'] }) {
    return (
        <Section id="about-yona" surface="base" rhythm="md" accent="navy">
            <Eyebrow accent="navy">{copy.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-h1">{copy.title}</h2>
            <div className="mt-6 max-w-reading space-y-4 text-base font-light text-neutral-700">
                <p>{copy.body}</p>
                <p>{copy.meaning}</p>
            </div>
        </Section>
    );
}
