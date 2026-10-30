import type { LandingCopy } from '../../copy';
import { Section } from '../Section';

export function Questions({ copy }: { copy: LandingCopy['questions'] }) {
    return (
        <Section id="questions" surface="base" rhythm="md">
            <h2 className="max-w-2xl text-h1">{copy.title}</h2>
            <div className="mt-8 max-w-reading divide-y divide-neutral-300">
                {copy.items.map((question) => (
                    <section key={question.title} className="py-6 first:pt-0">
                        <h3 className="text-h3">{question.title}</h3>
                        <p className="mt-3 text-base font-light text-neutral-700">{question.body}</p>
                    </section>
                ))}
            </div>
        </Section>
    );
}
