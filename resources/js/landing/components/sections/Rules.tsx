import type { LandingStrings } from '../../config';
import { Eyebrow, Section } from '../Section';

// Mỗi nguyên tắc có một tấm tranh vuông phía trên. Bốn ô chỉ có chữ thì section
// này và section liền trước cộng lại thành một mảng trắng dài giữa trang.
const ITEMS = [
    { key: 'dedupe', art: 'rule-1' },
    { key: 'draft', art: 'rule-2' },
    { key: 'source', art: 'rule-3' },
    { key: 'respect', art: 'rule-4' },
] as const;

export function Rules({ strings }: { strings: LandingStrings['rules'] }) {
    return (
        <Section surface="band">
            <Eyebrow>{strings.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-h1">{strings.title}</h2>

            <dl className="mt-14 grid gap-x-8 gap-y-12 md:mt-20 md:grid-cols-4">
                {ITEMS.map(({ key, art }) => {
                    const item = strings.items[key];

                    return (
                        <div key={key}>
                            <img
                                aria-hidden
                                alt=""
                                src={`/landing/art/${art}.webp`}
                                width={152}
                                height={152}
                                loading="lazy"
                                decoding="async"
                                className="aspect-square w-full select-none object-cover"
                            />
                            <dt className="mt-5 text-h3">{item.title}</dt>
                            <dd className="mt-2.5 text-sm font-light text-neutral-600">{item.description}</dd>
                        </div>
                    );
                })}
            </dl>
        </Section>
    );
}
